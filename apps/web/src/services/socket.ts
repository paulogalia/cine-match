import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@cine-match/shared';

export type TypedClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function createClientSocket(): TypedClientSocket {
  return io({
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 800,
    reconnectionDelayMax: 4000,
  });
}
