import { Worker, type Job } from 'bullmq';
import { redis } from '@repo/queue-config/redis';
import type { EmailJobData, JobResult } from '@repo/queue-config/jobTypes';
import { jobsProcessed, jobDuration, activeWorkers, jobRetries } from '@repo/metrics';
import { startMetricsServer } from './metricsServer.js';

const QUEUE = 'email';

const metricsPort = parseInt(process.env.WORKER_METRICS_PORT ?? '0', 10);
startMetricsServer(metricsPort, 'email');

const worker = new Worker<EmailJobData, JobResult>(
  QUEUE,
  async (job: Job<EmailJobData>): Promise<JobResult> => {
    const start = Date.now();

    await job.updateProgress(10);

    if (process.env.SIMULATE_EMAIL_FAILURE === '1' && Math.random() < 0.15) {
      throw new Error('Simulated SMTP failure');
    }

    console.log(`[EmailWorker] Sending to ${job.data.to} | Job: ${job.id}`);
    await new Promise((r) => setTimeout(r, 200));

    await job.updateProgress(100);

    const processingMs = Date.now() - start;
    jobsProcessed.inc({ queue: QUEUE, status: 'completed' });
    jobDuration.observe({ queue: QUEUE }, processingMs / 1000);

    return { success: true, processingMs };
  },
  {
    connection: redis,
    concurrency: 5,
    limiter: {
      max: 100,
      duration: 60_000,
    },
  },
);

activeWorkers.set({ queue: QUEUE }, 1);

worker.on('failed', (job, err) => {
  console.error(`[EmailWorker] Job ${job?.id} failed: ${err.message}`);
  jobsProcessed.inc({ queue: QUEUE, status: 'failed' });
  if (job && job.attemptsMade > 1) {
    jobRetries.inc({ queue: QUEUE }, job.attemptsMade - 1);
  }
});

worker.on('stalled', (jobId) => {
  console.warn(`[EmailWorker] Job ${jobId} stalled — will retry`);
});

worker.on('error', (err) => {
  console.error('[EmailWorker] Worker error', err);
});

console.log('[EmailWorker] Started, waiting for jobs...');

function shutdown() {
  activeWorkers.set({ queue: QUEUE }, 0);
  void worker.close().then(() => process.exit(0));
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
