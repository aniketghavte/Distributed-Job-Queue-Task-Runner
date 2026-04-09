import { Router } from 'express';
import { z } from 'zod';
import { jobSubmissionLimiter } from '../middleware/rateLimit.js';
import { emailQueue, imageQueue, aiQueue } from '@repo/queue-config/queues';
import type { QueueName } from '@repo/queue-config/jobTypes';
import { enqueueEmail } from '../producers/emailProducer.js';
import { enqueueImage } from '../producers/imageProducer.js';
import { enqueueAi } from '../producers/aiProducer.js';

const router = Router();

const queues = {
  email: emailQueue,
  image: imageQueue,
  ai: aiQueue,
} as const;

function isQueueName(s: string): s is QueueName {
  return s === 'email' || s === 'image' || s === 'ai';
}

const emailBodySchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(500),
  body: z.string().min(1).max(100_000),
  templateId: z.string().max(128).optional(),
  priority: z.number().int().min(-100).max(100).optional(),
});

const imageBodySchema = z.object({
  sourceUrl: z.string().url().max(2048),
  outputBucket: z.string().min(1).max(256),
  resize: z.object({
    width: z.number().int().positive().max(8192),
    height: z.number().int().positive().max(8192),
  }),
  format: z.enum(['webp', 'jpeg', 'png']),
  priority: z.number().int().min(-100).max(100).optional(),
});

const aiBodySchema = z.object({
  type: z.enum(['summarize', 'embed', 'classify']),
  content: z.string().min(1).max(500_000),
  model: z.string().max(128).optional(),
  callbackUrl: z.string().url().max(2048).optional(),
  delay: z.coerce.number().int().min(0).max(86400).optional(),
});

router.post('/email', jobSubmissionLimiter, async (req, res, next) => {
  try {
    const parsed = emailBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }
    const { priority, ...data } = parsed.data;
    const job = await enqueueEmail(data, {
      priority: priority ?? 0,
    });
    res.status(202).json({ jobId: job.id, queue: 'email', status: 'queued' });
  } catch (e) {
    next(e);
  }
});

router.post('/image', jobSubmissionLimiter, async (req, res, next) => {
  try {
    const parsed = imageBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }
    const { priority, ...data } = parsed.data;
    const job = await enqueueImage(data, { priority: priority ?? 0 });
    res.status(202).json({ jobId: job.id, queue: 'image', status: 'queued' });
  } catch (e) {
    next(e);
  }
});

router.post('/ai', jobSubmissionLimiter, async (req, res, next) => {
  try {
    const parsed = aiBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }
    const { delay: delaySec, ...data } = parsed.data;
    const delayMs = delaySec != null ? delaySec * 1000 : 0;
    const job = await enqueueAi(data, { delay: delayMs });
    res.status(202).json({
      jobId: job.id,
      queue: 'ai',
      status: 'queued',
      scheduledInMs: delayMs,
    });
  } catch (e) {
    next(e);
  }
});

router.get('/:queue/stats', async (req, res, next) => {
  try {
    const name = req.params.queue;
    if (!isQueueName(name)) {
      res.status(404).json({ error: 'Queue not found' });
      return;
    }
    const queue = queues[name];
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);
    res.json({ queue: name, waiting, active, completed, failed, delayed });
  } catch (e) {
    next(e);
  }
});

router.get('/:queue/:id', async (req, res, next) => {
  try {
    const name = req.params.queue;
    if (!isQueueName(name)) {
      res.status(404).json({ error: 'Queue not found' });
      return;
    }
    const queue = queues[name];
    const job = await queue.getJob(req.params.id);
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    const state = await job.getState();
    res.json({
      id: job.id,
      queue: name,
      state,
      progress: job.progress,
      data: job.data,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
