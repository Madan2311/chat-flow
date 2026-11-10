export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface Chat {
  id: string;
  name: string | null;
  isGroup: boolean;
  participants: User[];
  createdAt: string;
  lastMessage?: Message | null;
  unreadCount?: number;
}
export interface Message {
  id: string;
  chatId: string;
  content: string;
  createdAt: string;
  sender: Pick<User, 'id' | 'name'>;
}

export interface SendAck {
  ok: boolean;
}

export interface SocketError {
  status?: string;
  message: string;
}