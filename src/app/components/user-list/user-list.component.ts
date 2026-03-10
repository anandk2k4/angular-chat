import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User } from '../../models/chat.model';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="user-list-card">
      <div class="list-header">
        <h3 class="list-title">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          Users ({{ users.length }})
        </h3>
      </div>
      <div class="list-body">
        <div *ngFor="let user of users" class="user-item">
          <div class="avatar">{{ user.username.charAt(0).toUpperCase() }}</div>
          <div class="user-info">
            <div class="name-row">
              <span class="user-name">{{ user.username }}</span>
              <span *ngIf="user.username === currentUsername" class="you-badge">(you)</span>
            </div>
            <span *ngIf="isTyping(user.id)" class="typing-indicator">typing...</span>
          </div>
          <div class="online-dot"></div>
        </div>
        <div *ngIf="users.length === 0" class="empty">
          <p>No users yet</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .user-list-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    .list-header {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border);
      background: color-mix(in oklch, var(--muted) 40%, var(--card));
    }
    .list-title {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--muted-foreground);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .list-body {
      flex: 1;
      overflow-y: auto;
      padding: 0.5rem;
    }
    .user-item {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.5rem 0.625rem;
      border-radius: calc(var(--radius) - 2px);
      transition: background 0.1s;
    }
    .user-item:hover { background: var(--muted); }
    .avatar {
      width: 1.875rem;
      height: 1.875rem;
      border-radius: 50%;
      background: color-mix(in oklch, var(--primary) 15%, transparent);
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 700;
      flex-shrink: 0;
    }
    .user-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }
    .name-row {
      display: flex;
      align-items: baseline;
      gap: 0.3rem;
    }
    .user-name {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--foreground);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    /* ── "(you)" badge — light muted style ── */
    .you-badge {
      font-size: 0.7rem;
      font-weight: 400;
      color: var(--muted-foreground);
      opacity: 0.7;
      flex-shrink: 0;
    }
    .typing-indicator {
      font-size: 0.7rem;
      color: var(--primary);
      font-style: italic;
    }
    .online-dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
      background: #22c55e;
      flex-shrink: 0;
    }
    .empty {
      text-align: center;
      padding: 1rem;
      color: var(--muted-foreground);
      font-size: 0.875rem;
    }
  `]
})
export class UserListComponent {
  @Input() users: User[] = [];
  @Input() typingUsers: { userId: string; username: string }[] = [];
  @Input() currentUsername = '';

  isTyping(userId: string): boolean {
    return this.typingUsers.some(u => u.userId === userId);
  }
}
