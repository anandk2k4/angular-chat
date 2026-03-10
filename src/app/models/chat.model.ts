export interface Reaction {
  emoji: string;
  users: string[]; // usernames who reacted
}

export interface Message {
  id: string;
  userId: string;
  username: string;
  content: string;
  timestamp: number;
  type: 'message' | 'system';
  replyTo?: {
    id: string;
    username: string;
    content: string;
  };
  reactions: { [emoji: string]: string[] }; // emoji -> array of usernames
}

export interface User {
  id: string;
  username: string;
}

export interface PollResponse {
  messages: Message[];
  users: User[];
  typingUsers: string[];
}
