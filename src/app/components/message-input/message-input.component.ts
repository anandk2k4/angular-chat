import { Component, Input, Output, EventEmitter, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Message } from '../../models/chat.model';

@Component({
  selector: 'app-message-input',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="input-wrapper">

      <!-- Reply preview bar -->
      <div *ngIf="replyTo" class="reply-bar">
        <div class="reply-bar-content">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 17 4 12 9 7"></polyline>
            <path d="M20 18v-2a4 4 0 0 0-4-4H4"></path>
          </svg>
          <span class="reply-to-name">{{ replyTo.username }}</span>
          <span class="reply-to-text">{{ replyTo.content | slice:0:60 }}{{ replyTo.content.length > 60 ? '...' : '' }}</span>
        </div>
        <button class="cancel-reply" (click)="clearReply()" title="Cancel reply">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- Input row -->
      <div class="input-row">
        <input
          type="text"
          class="input"
          [placeholder]="replyTo ? 'Reply to ' + replyTo.username + '...' : 'Type your message...'"
          [disabled]="disabled"
          [value]="message()"
          (input)="handleTyping($any($event.target).value)"
          (keydown)="handleKeyDown($event)"
        />
        <button class="send-btn" [disabled]="disabled || !message().trim()" (click)="handleSend()">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .input-wrapper { display: flex; flex-direction: column; gap: 0; }

    /* ── Reply bar ── */
    .reply-bar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.375rem 0.75rem;
      background: color-mix(in oklch, var(--primary) 8%, var(--card));
      border: 1px solid color-mix(in oklch, var(--primary) 30%, var(--border));
      border-bottom: none;
      border-radius: var(--radius) var(--radius) 0 0;
    }
    .reply-bar-content {
      display: flex; align-items: center; gap: 0.375rem;
      min-width: 0; flex: 1;
      color: var(--muted-foreground);
    }
    .reply-to-name {
      font-size: 0.75rem; font-weight: 700; color: var(--primary);
      white-space: nowrap;
    }
    .reply-to-text {
      font-size: 0.75rem; color: var(--muted-foreground);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .cancel-reply {
      background: none; border: none; cursor: pointer;
      color: var(--muted-foreground); padding: 0.125rem;
      display: flex; align-items: center;
      transition: color 0.1s;
      flex-shrink: 0;
    }
    .cancel-reply:hover { color: var(--foreground); }

    /* ── Input row ── */
    .input-row { display: flex; gap: 0.5rem; align-items: center; }
    .input {
      flex: 1; padding: 0.5rem 0.75rem;
      border: 1px solid var(--border); border-radius: var(--radius);
      background: var(--input); color: var(--foreground);
      font-size: 0.875rem; font-family: inherit;
      transition: border-color 0.15s, box-shadow 0.15s; outline: none;
    }
    .input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px color-mix(in oklch, var(--primary) 20%, transparent);
    }
    .input::placeholder { color: var(--muted-foreground); }
    .input:disabled { opacity: 0.5; cursor: not-allowed; }
    .send-btn {
      display: flex; align-items: center; justify-content: center;
      width: 2.25rem; height: 2.25rem;
      background: var(--primary); color: var(--primary-foreground);
      border: none; border-radius: var(--radius); cursor: pointer;
      flex-shrink: 0; transition: opacity 0.15s;
    }
    .send-btn:hover:not(:disabled) { opacity: 0.9; }
    .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  `]
})
export class MessageInputComponent implements OnDestroy {
  @Input() disabled = false;
  @Input() replyTo: Message | null = null;
  @Output() send = new EventEmitter<{ content: string; replyTo?: Message['replyTo'] }>();
  @Output() typing = new EventEmitter<boolean>();
  @Output() cancelReply = new EventEmitter<void>();

  message = signal('');
  private isTyping = false;
  private typingTimeout?: ReturnType<typeof setTimeout>;

  handleTyping(value: string): void {
    this.message.set(value);
    if (!this.isTyping) { this.isTyping = true; this.typing.emit(true); }
    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => { this.isTyping = false; this.typing.emit(false); }, 1000);
  }

  handleSend(): void {
    const content = this.message().trim();
    if (!content) return;
    const replyTo = this.replyTo
      ? { id: this.replyTo.id, username: this.replyTo.username, content: this.replyTo.content }
      : undefined;
    this.send.emit({ content, replyTo });
    this.message.set('');
    this.isTyping = false;
    this.typing.emit(false);
    clearTimeout(this.typingTimeout);
    this.cancelReply.emit();
  }

  handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.handleSend(); }
    if (e.key === 'Escape' && this.replyTo) this.clearReply();
  }

  clearReply(): void { this.cancelReply.emit(); }

  ngOnDestroy(): void { clearTimeout(this.typingTimeout); }
}
