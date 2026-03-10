import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { ChatRoomComponent } from './components/chat-room/chat-room.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'chat/:roomId', component: ChatRoomComponent },
  { path: '**', redirectTo: '' }
];
