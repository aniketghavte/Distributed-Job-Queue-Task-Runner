import {
  emailQueue,
  imageQueue,
  aiQueue,
} from '@repo/queue-config/queues';
import { queueDepth } from '@repo/metrics';

const queues = [
  { name: 'email' as const, q: emailQueue },
  { name: 'image' as const, q: imageQueue },
  { name: 'ai' as const, q: aiQueue },
];

export function startQueueDepthPoller(intervalMs = 5000): () => void {
  let timer: ReturnType<typeof setInterval> | undefined;

  const tick = async () => {
    try {
      await Promise.all(
        queues.map(async ({ name, q }) => {
          const waiting = await q.getWaitingCount();
          queueDepth.set({ queue: name }, waiting);
        }),
      );
    } catch {
      // Redis blip — skip tick
    }
  };

  void tick();
  timer = setInterval(() => void tick(), intervalMs);

  return () => {
    if (timer) clearInterval(timer);
  };
}
