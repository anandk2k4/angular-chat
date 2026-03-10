import {
  Component, OnInit, OnDestroy, AfterViewChecked,
  ViewChild, ElementRef, signal, HostListener
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../services/chat.service';
import { Message } from '../../models/chat.model';
import { MessageBubbleComponent } from '../message-bubble/message-bubble.component';
import { MessageInputComponent } from '../message-input/message-input.component';
import { UserListComponent } from '../user-list/user-list.component';

@Component({
  selector: 'app-chat-room',
  standalone: true,
  imports: [CommonModule, MessageBubbleComponent, MessageInputComponent, UserListComponent],
  templateUrl: './chat-room.component.html',
  styleUrls: ['./chat-room.component.css']
})
export class ChatRoomComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesEnd') messagesEnd!: ElementRef;
  @ViewChild('messagesList') messagesList!: ElementRef;

  roomId = '';
  username = '';

  replyTo = signal<Message | null>(null);
  unreadCount = signal(0);
  isAtBottom = true;
  private lastMessageCount = 0;
  private shouldScrollToBottom = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public chatService: ChatService
  ) {}

  async ngOnInit(): Promise<void> {
    this.roomId = this.route.snapshot.paramMap.get('roomId') || '';
    this.username = this.route.snapshot.queryParamMap.get('username') || 'Anonymous';

    if (!this.roomId) { this.router.navigate(['/']); return; }

    try {
      await this.chatService.joinRoom(this.roomId, this.username);
      this.shouldScrollToBottom = true;
      this.lastMessageCount = this.chatService.messages().length;
    } catch (err: any) {
      if (err?.status !== 403) console.error('Failed to join room:', err);
    }
  }

  ngAfterViewChecked(): void {
    const msgs = this.chatService.messages();
    const newCount = msgs.length;

    if (newCount > this.lastMessageCount) {
      const added = newCount - this.lastMessageCount;
      this.lastMessageCount = newCount;

      if (this.isAtBottom) {
        this.shouldScrollToBottom = true;
      } else {
        // Only count real messages as unread, not system events
        const newMsgs = msgs.slice(-added);
        const realNew = newMsgs.filter(m => m.type === 'message').length;
        if (realNew > 0) this.unreadCount.update(n => n + realNew);
      }
    }

    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void { this.chatService.leaveRoom(); }

  async handleLeaveRoom(): Promise<void> {
    await this.chatService.leaveRoom();
    this.router.navigate(['/']);
  }

  handleSend(event: { content: string; replyTo?: Message['replyTo'] }): void {
    this.chatService.sendMessage(event.content, event.replyTo);
    this.replyTo.set(null);
    this.shouldScrollToBottom = true;
  }

  handleTyping(isTyping: boolean): void { this.chatService.setTyping(isTyping); }

  handleReply(message: Message): void { this.replyTo.set(message); }

  handleReact(event: { messageId: string; emoji: string }): void {
    this.chatService.toggleReaction(event.messageId, event.emoji);
  }

  handleCancelReply(): void { this.replyTo.set(null); }

  scrollToLatest(): void {
    this.shouldScrollToBottom = true;
    this.unreadCount.set(0);
  }

  onScroll(): void {
    const el = this.messagesList?.nativeElement;
    if (!el) return;
    const threshold = 80;
    this.isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    if (this.isAtBottom) this.unreadCount.set(0);
  }

  isOwnMessage(messageUsername: string): boolean { return messageUsername === this.username; }

  trackMessage(_: number, msg: { id: string }): string { return msg.id; }

  private scrollToBottom(): void {
    try { this.messagesEnd?.nativeElement.scrollIntoView({ behavior: 'smooth' }); } catch {}
  }

  get typingUsernames(): string[] {
    return this.chatService.typingUsernames;
  }
}
