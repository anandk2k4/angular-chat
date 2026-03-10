import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Message } from '../../models/chat.model';

const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

@Component({
  selector: 'app-message-bubble',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- System message -->
    <div *ngIf="message.type === 'system'" class="system-msg">
      <span class="system-line"></span>
      <span class="system-text">{{ message.content }}</span>
      <span class="system-line"></span>
    </div>

    <!-- Regular message -->
    <div *ngIf="message.type !== 'system'"
         class="bubble-wrapper"
         [class.own]="isOwn"
         (mouseenter)="showActions = true"
         (mouseleave)="showActions = false">

      <div class="bubble-content" [class.own]="isOwn">

        <!-- Meta -->
        <div class="meta">
          <span class="username">{{ isOwn ? 'You' : message.username }}</span>
          <span class="time" [title]="exactTime">{{ timeAgo }}</span>
        </div>

        <!-- Reply quote -->
        <div *ngIf="message.replyTo" class="reply-quote" [class.own]="isOwn">
          <span class="reply-name">{{ message.replyTo.username }}</span>
          <span class="reply-text">{{ message.replyTo.content | slice:0:80 }}{{ message.replyTo.content.length > 80 ? '...' : '' }}</span>
        </div>

        <!-- Bubble -->
        <div class="bubble" [class.own]="isOwn" [class.other]="!isOwn">
          <p class="text">{{ message.content }}</p>
        </div>

        <!-- Reactions display -->
        <div class="reactions" *ngIf="reactionEntries.length > 0">
          <button
            *ngFor="let r of reactionEntries"
            class="reaction-pill"
            [class.reacted]="r.hasMe"
            (click)="onReact(r.emoji)"
            [title]="r.users.join(', ')"
          >
            {{ r.emoji }} {{ r.count }}
          </button>
        </div>
      </div>

      <!-- Hover action buttons -->
      <div class="action-btns" [class.own]="isOwn" *ngIf="showActions">
        <!-- Reply button -->
        <button class="action-btn" title="Reply" (click)="onReply()">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 17 4 12 9 7"></polyline>
            <path d="M20 18v-2a4 4 0 0 0-4-4H4"></path>
          </svg>
        </button>
        <!-- Emoji picker toggle -->
        <button class="action-btn" title="React" (click)="toggleEmojiPicker($event)">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
            <line x1="9" y1="9" x2="9.01" y2="9"></line>
            <line x1="15" y1="9" x2="15.01" y2="9"></line>
          </svg>
        </button>
      </div>

      <!-- Emoji picker popup -->
      <div class="emoji-picker" [class.own]="isOwn" *ngIf="showEmojiPicker">
        <button *ngFor="let e of emojis" class="emoji-btn" (click)="onReact(e)">{{ e }}</button>
      </div>

    </div>
  `,
  styles: [`
    /* ── System ── */
    .system-msg {
      display: flex; align-items: center; gap: 0.625rem;
      margin: 0.75rem 0; padding: 0 0.25rem;
    }
    .system-line { flex: 1; height: 1px; background: var(--border); }
    .system-text {
      font-size: 0.72rem; color: var(--muted-foreground);
      white-space: nowrap; font-style: italic; letter-spacing: 0.01em;
    }

    /* ── Wrapper ── */
    .bubble-wrapper {
      display: flex; align-items: center;
      gap: 0.375rem; margin-bottom: 0.75rem;
      position: relative;
    }
    /* Other's msg: bubble left, buttons right next to it */
    .bubble-wrapper.own { flex-direction: row-reverse; }

    /* ── Content ── shrinks to hug the bubble, not stretch full width */
    .bubble-content {
      display: flex; flex-direction: column;
      gap: 0.25rem;
      align-items: flex-start;
      /* No flex:1 — content only takes as much space as the bubble needs */
    }
    .bubble-content.own { align-items: flex-end; }

    /* ── Meta ── */
    .meta { display: flex; align-items: center; gap: 0.5rem; }
    .username { font-size: 0.75rem; font-weight: 600; color: var(--muted-foreground); }
    .time {
      font-size: 0.72rem;
      color: color-mix(in oklch, var(--muted-foreground) 65%, transparent);
      cursor: default; transition: color 0.15s;
    }
    .time:hover { color: var(--muted-foreground); }

    /* ── Reply quote ── */
    .reply-quote {
      display: flex; flex-direction: column;
      background: color-mix(in oklch, var(--border) 60%, transparent);
      border-left: 3px solid var(--primary);
      border-radius: 0.375rem;
      padding: 0.25rem 0.5rem;
      max-width: 18rem;
      gap: 0.125rem;
    }
    .reply-quote.own { border-left: none; border-right: 3px solid var(--primary); }
    .reply-name { font-size: 0.7rem; font-weight: 700; color: var(--primary); }
    .reply-text {
      font-size: 0.75rem; color: var(--muted-foreground);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }

    /* ── Bubble ── */
    .bubble {
      padding: 0.5rem 0.75rem; border-radius: 0.625rem;
      max-width: 20rem; word-break: break-word;
    }
    .bubble.own {
      background: var(--primary); color: var(--primary-foreground);
      border-bottom-right-radius: 0.125rem;
    }
    .bubble.other {
      background: var(--secondary); color: var(--secondary-foreground);
      border-bottom-left-radius: 0.125rem;
    }
    .text { font-size: 0.875rem; line-height: 1.5; }

    /* ── Reactions ── */
    .reactions { display: flex; flex-wrap: wrap; gap: 0.25rem; margin-top: 0.125rem; }
    .reaction-pill {
      display: flex; align-items: center; gap: 0.2rem;
      padding: 0.15rem 0.45rem;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: var(--card);
      font-size: 0.78rem; cursor: pointer;
      transition: background 0.12s, border-color 0.12s;
    }
    .reaction-pill:hover { background: var(--muted); }
    .reaction-pill.reacted {
      background: color-mix(in oklch, var(--primary) 12%, transparent);
      border-color: var(--primary);
    }

    /* ── Action buttons ──
       Other msg  (row-normal):   buttons sit AFTER bubble  = right side  ✓
       Own msg    (row-reverse):  buttons sit AFTER bubble in DOM, but row-reverse
                                  flips them to LEFT side visually            ✓  */
    .action-btns {
      display: flex; flex-direction: row; gap: 0.25rem;
      align-self: center;
      /* natural order = appears to the right of other's bubble */
    }
    /* No override needed for own — row-reverse already places them on the left */
    .action-btn {
      display: flex; align-items: center; justify-content: center;
      width: 1.625rem; height: 1.625rem;
      border: 1px solid var(--border); border-radius: 0.375rem;
      background: var(--card); color: var(--muted-foreground);
      cursor: pointer; transition: background 0.1s, color 0.1s;
    }
    .action-btn:hover { background: var(--muted); color: var(--foreground); }

    /* ── Emoji picker ──
       Other msg: picker opens rightward from buttons (left anchor)
       Own msg:   picker opens leftward  from buttons (right anchor) */
    .emoji-picker {
      position: absolute; bottom: 2.2rem;
      display: flex; gap: 0.2rem;
      background: var(--card); border: 1px solid var(--border);
      border-radius: 0.625rem; padding: 0.375rem 0.5rem;
      box-shadow: 0 4px 16px rgba(0,0,0,0.12);
      z-index: 10;
      /* Default (other's msg): anchor to left so it opens rightward */
      left: 0; right: auto;
    }
    .emoji-picker.own {
      /* Own msg: anchor to right so it opens leftward */
      right: 0; left: auto;
    }
    .emoji-btn {
      font-size: 1.1rem; background: none; border: none;
      cursor: pointer; padding: 0.2rem;
      border-radius: 0.25rem; transition: background 0.1s;
      line-height: 1;
    }
    .emoji-btn:hover { background: var(--muted); }
  `]
})
export class MessageBubbleComponent implements OnInit, OnDestroy {
  @Input() message!: Message;
  @Input() isOwn = false;
  @Input() currentUsername = '';
  @Output() reply = new EventEmitter<Message>();
  @Output() react = new EventEmitter<{ messageId: string; emoji: string }>();

  timeAgo = '';
  exactTime = '';
  showActions = false;
  showEmojiPicker = false;
  emojis = EMOJI_LIST;

  private timer?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.updateTimeAgo();
    this.exactTime = new Date(this.message.timestamp)
      .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    this.timer = setInterval(() => this.updateTimeAgo(), 30_000);
  }

  ngOnDestroy(): void { clearInterval(this.timer); }

  get reactionEntries() {
    return Object.entries(this.message.reactions || {}).map(([emoji, users]) => ({
      emoji,
      users,
      count: users.length,
      hasMe: users.includes(this.currentUsername),
    }));
  }

  onReply(): void {
    this.showActions = false;
    this.reply.emit(this.message);
  }

  onReact(emoji: string): void {
    this.showEmojiPicker = false;
    this.react.emit({ messageId: this.message.id, emoji });
  }

  toggleEmojiPicker(e: Event): void {
    e.stopPropagation();
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  private updateTimeAgo(): void {
    const diff = Date.now() - this.message.timestamp;
    const s = Math.floor(diff / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (s < 60)      this.timeAgo = 'just now';
    else if (m < 60) this.timeAgo = `${m}m ago`;
    else if (h < 24) this.timeAgo = `${h}h ago`;
    else             this.timeAgo = new Date(this.message.timestamp).toLocaleDateString();
  }
}
