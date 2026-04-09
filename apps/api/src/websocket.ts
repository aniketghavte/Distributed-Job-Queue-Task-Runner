import type { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import {
  emailQueueEvents,
  imageQueueEvents,
  aiQueueEvents,
} from '@repo/queue-config/queues';

export type LiveEvent = {
  type: 'job' | 'ping';
  queue: string;
  event: string;
  jobId?: string;
  at: number;
};

function broadcast(clients: Set<WebSocket>, payload: LiveEvent) {
  const data = JSON.stringify(payload);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

export function attachLiveWebSocket(server: Server, path = '/live'): WebSocketServer {
  const wss = new WebSocketServer({ server, path });
  const clients = new Set<WebSocket>();

  wss.on('connection', (ws) => {
    clients.add(ws);
    ws.send(JSON.stringify({ type: 'ping', queue: 'system', event: 'connected', at: Date.now() } satisfies LiveEvent));
    ws.on('close', () => clients.delete(ws));
  });

  const forward = (queue: string, event: string, args: { jobId?: string }) => {
    broadcast(clients, {
      type: 'job',
      queue,
      event,
      jobId: args.jobId,
      at: Date.now(),
    });
  };

  emailQueueEvents.on('completed', ({ jobId }) => forward('email', 'completed', { jobId }));
  emailQueueEvents.on('failed', ({ jobId }) => forward('email', 'failed', { jobId }));
  emailQueueEvents.on('active', ({ jobId }) => forward('email', 'active', { jobId }));

  imageQueueEvents.on('completed', ({ jobId }) => forward('image', 'completed', { jobId }));
  imageQueueEvents.on('failed', ({ jobId }) => forward('image', 'failed', { jobId }));
  imageQueueEvents.on('active', ({ jobId }) => forward('image', 'active', { jobId }));

  aiQueueEvents.on('completed', ({ jobId }) => forward('ai', 'completed', { jobId }));
  aiQueueEvents.on('failed', ({ jobId }) => forward('ai', 'failed', { jobId }));
  aiQueueEvents.on('active', ({ jobId }) => forward('ai', 'active', { jobId }));

  return wss;
}
