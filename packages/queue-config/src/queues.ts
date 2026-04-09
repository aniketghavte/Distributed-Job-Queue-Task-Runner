import { Queue, QueueEvents } from 'bullmq';
import { redis } from './redis.js';

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 1000,
  },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 500 },
};

export const emailQueue = new Queue('email', {
  connection: redis,
  defaultJobOptions,
});

export const imageQueue = new Queue('image', {
  connection: redis,
  defaultJobOptions: { ...defaultJobOptions, attempts: 5 },
});

export const aiQueue = new Queue('ai', {
  connection: redis,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 2,
  },
});

export const emailQueueEvents = new QueueEvents('email', { connection: redis });
export const imageQueueEvents = new QueueEvents('image', { connection: redis });
export const aiQueueEvents = new QueueEvents('ai', { connection: redis });

export const queuesByName = {
  email: emailQueue,
  image: imageQueue,
  ai: aiQueue,
} as const;

export async function initQueueEventListeners(): Promise<void> {
  await Promise.all([
    emailQueueEvents.waitUntilReady(),
    imageQueueEvents.waitUntilReady(),
    aiQueueEvents.waitUntilReady(),
  ]);
}
