import { Injectable, signal } from '@angular/core';
import { Message, User } from '../models/chat.model';
import { io, Socket } from 'socket.io-client';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private _messages = signal<Message[]>([]);
  private _users = signal<User[]>([]);
  private _typingUsers = signal<{ userId: string; username: string }[]>([]);
  private _connected = signal<boolean>(false);
  private _roomFull = signal<boolean>(false);

  messages = this._messages.asReadonly();
  users = this._users.asReadonly();
  typingUsers = this._typingUsers.asReadonly();
  connected = this._connected.asReadonly();
  roomFull = this._roomFull.asReadonly();

  private socket?: Socket;
  private currentUserId?: string;
  private currentRoomId?: string;
  private currentUsername?: string;

  joinRoom(roomId: string, username: string): Promise<string> {
    // Reuse existing userId on refresh — prevents duplicate users
    const existingId = sessionStorage.getItem(`userId-${roomId}`);
    const userId = existingId || this.generateId();
    this.currentUserId = userId;
    this.currentRoomId = roomId;
    this.currentUsername = username;
    sessionStorage.setItem(`userId-${roomId}`, userId);

    return new Promise((resolve, reject) => {
      // Connect to the Socket.io server
      // In dev: proxy forwards to localhost:3000
      // In prod: same origin
      this.socket = io('/', {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      // ── Connection established ──
      this.socket.on('connect', () => {
        console.log('Socket connected:', this.socket?.id);
        // Tell server we want to join this room
        this.socket?.emit('join', { roomId, userId, username });
      });

      // ── Server confirmed join — get history + users ──
      this.socket.on('room-joined', ({ messages, users }) => {
        this._messages.set(messages);
        this._users.set(users);
        this._connected.set(true);
        resolve(userId);
      });

      // ── Room is full ──
      this.socket.on('room-full', () => {
        this._roomFull.set(true);
        reject(new Error('Room is full'));
      });

      // ── New message (from anyone including self) ──
      this.socket.on('new-message', (message: Message) => {
        this._messages.update(msgs => [...msgs, message]);
      });

      // ── User list changed (join/leave) ──
      this.socket.on('users-updated', (users: User[]) => {
        this._users.set(users);
      });

      // ── Typing update from other users ──
      this.socket.on('typing-updated', ({ userId: uid, username: uname, isTyping }) => {
        this._typingUsers.update(current => {
          const filtered = current.filter(u => u.userId !== uid);
          return isTyping ? [...filtered, { userId: uid, username: uname }] : filtered;
        });
      });

      // ── Reaction updated ──
      this.socket.on('reaction-updated', (updatedMessage: Message) => {
        this._messages.update(msgs =>
          msgs.map(m => m.id === updatedMessage.id ? updatedMessage : m)
        );
      });

      // ── Disconnected ──
      this.socket.on('disconnect', () => {
        console.log('Socket disconnected');
        this._connected.set(false);
      });

      // ── Reconnected ──
      this.socket.on('reconnect', () => {
        console.log('Socket reconnected');
        this._connected.set(true);
        // Rejoin the room after reconnect
        this.socket?.emit('join', { roomId, userId, username });
      });

      // ── Connection error ──
      this.socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err);
        reject(err);
      });
    });
  }

  sendMessage(content: string, replyTo?: Message['replyTo']): void {
    if (!this.socket || !this.currentRoomId || !this.currentUserId || !this.currentUsername) return;
    this.socket.emit('message', {
      roomId: this.currentRoomId,
      userId: this.currentUserId,
      username: this.currentUsername,
      content,
      replyTo,
    });
  }

  toggleReaction(messageId: string, emoji: string): void {
    if (!this.socket || !this.currentRoomId || !this.currentUsername) return;
    this.socket.emit('reaction', {
      roomId: this.currentRoomId,
      messageId,
      emoji,
      username: this.currentUsername,
    });
  }

  setTyping(isTyping: boolean): void {
    if (!this.socket || !this.currentRoomId || !this.currentUserId || !this.currentUsername) return;
    this.socket.emit('typing', {
      roomId: this.currentRoomId,
      userId: this.currentUserId,
      username: this.currentUsername,
      isTyping,
    });
  }

  leaveRoom(): Promise<void> {
    const roomId = this.currentRoomId;
    const userId = this.currentUserId;

    if (roomId) sessionStorage.removeItem(`userId-${roomId}`);

    return new Promise((resolve) => {
      if (this.socket && roomId && userId) {
        this.socket.emit('leave', { roomId, userId });
        this.socket.disconnect();
      }
      this.resetState();
      resolve();
    });
  }

  get currentUsername$(): string | undefined { return this.currentUsername; }

  // Convert typing users to just usernames (excluding self) for display
  get typingUsernames(): string[] {
    return this._typingUsers()
      .filter(u => u.username !== this.currentUsername)
      .map(u => u.username);
  }

  private resetState(): void {
    this._messages.set([]);
    this._users.set([]);
    this._typingUsers.set([]);
    this._connected.set(false);
    this._roomFull.set(false);
    this.socket = undefined;
    this.currentUserId = undefined;
    this.currentRoomId = undefined;
    this.currentUsername = undefined;
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}
