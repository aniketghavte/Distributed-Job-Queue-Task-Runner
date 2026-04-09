import { Router } from 'express';
import {
  emailQueue,
  imageQueue,
  aiQueue,
} from '@repo/queue-config/queues';
import type { QueueName } from '@repo/queue-config/jobTypes';

const router = Router();

const queues = {
  email: emailQueue,
  image: imageQueue,
  ai: aiQueue,
} as const;

function isQueueName(s: string): s is QueueName {
  return s === 'email' || s === 'image' || s === 'ai';
}

router.get('/', async (_req, res, next) => {
  try {
    const names = Object.keys(queues) as QueueName[];
    const stats = await Promise.all(
      names.map(async (name) => {
        const q = queues[name];
        const [waiting, active, completed, failed, delayed] = await Promise.all([
          q.getWaitingCount(),
          q.getActiveCount(),
          q.getCompletedCount(),
          q.getFailedCount(),
          q.getDelayedCount(),
        ]);
        return { queue: name, waiting, active, completed, failed, delayed };
      }),
    );
    res.json({ queues: stats });
  } catch (e) {
    next(e);
  }
});

router.get('/:name', async (req, res, next) => {
  try {
    const name = req.params.name;
    if (!isQueueName(name)) {
      res.status(404).json({ error: 'Queue not found' });
      return;
    }
    const q = queues[name];
    const [waiting, active, completed, failed, delayed, isPaused] = await Promise.all([
      q.getWaitingCount(),
      q.getActiveCount(),
      q.getCompletedCount(),
      q.getFailedCount(),
      q.getDelayedCount(),
      q.isPaused(),
    ]);
    res.json({
      queue: name,
      waiting,
      active,
      completed,
      failed,
      delayed,
      isPaused,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
