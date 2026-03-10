import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  roomId = signal('');
  username = signal('');
  loading = signal(false);

  constructor(private router: Router) {}

  handleJoin(e: Event): void {
    e.preventDefault();
    if (!this.roomId().trim() || !this.username().trim()) return;

    this.loading.set(true);
    sessionStorage.setItem('username', this.username());
    sessionStorage.setItem('roomId', this.roomId());

    this.router.navigate(['/chat', this.roomId()], {
      queryParams: { username: this.username() }
    });
  }

  handleRandomRoom(): void {
    this.roomId.set(Math.random().toString(36).substring(2, 11));
  }

  handleRandomUsername(): void {
    const adjectives = ['Happy', 'Swift', 'Bright', 'Clever', 'Quick', 'Bold', 'Calm', 'Cool'];
    const nouns = ['Panda', 'Tiger', 'Eagle', 'Fox', 'Wolf', 'Lion', 'Bear', 'Hawk'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    this.username.set(`${adj}${noun}`);
  }

  get isDisabled(): boolean {
    return !this.roomId().trim() || !this.username().trim() || this.loading();
  }

  setRoomId(value: string): void { this.roomId.set(value); }
  setUsername(value: string): void { this.username.set(value); }
}
