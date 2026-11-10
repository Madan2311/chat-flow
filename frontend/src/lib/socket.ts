import { io, Socket } from 'socket.io-client';
import { API_URL } from '@/lib/api';

let socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  if (socket) return socket;

  socket = io(API_URL, {
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  return socket;
}

export function disconnectSocket() {
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
}