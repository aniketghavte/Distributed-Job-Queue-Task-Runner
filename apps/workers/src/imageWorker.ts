import { Worker, type Job } from 'bullmq';
import { redis } from '@repo/queue-config/redis';
import type { ImageJobData, JobResult } from '@repo/queue-config/jobTypes';
import { jobsProcessed, jobDuration, activeWorkers, jobRetries } from '@repo/metrics';
import { startMetricsServer } from './metricsServer.js';

const QUEUE = 'image';

const metricsPort = parseInt(process.env.WORKER_METRICS_PORT ?? '0', 10);
startMetricsServer(metricsPort, 'image');

const worker = new Worker<ImageJobData, JobResult>(
  QUEUE,
  async (job: Job<ImageJobData>): Promise<JobResult> => {
    const start = Date.now();
    const { sourceUrl, resize, format, outputBucket } = job.data;

    await job.updateProgress(15);
    console.log(`[ImageWorker] Fetch ${sourceUrl} → ${resize.width}x${resize.height} ${format} @ ${outputBucket}`);

    await new Promise((r) => setTimeout(r, 400));
    await job.updateProgress(60);

    // Simulated resize + encode (no real S3 in demo)
    const outputKey = `processed/${job.id}.${format}`;
    await new Promise((r) => setTimeout(r, 300));
    await job.updateProgress(100);

    const processingMs = Date.now() - start;
    jobsProcessed.inc({ queue: QUEUE, status: 'completed' });
    jobDuration.observe({ queue: QUEUE }, processingMs / 1000);

    return {
      success: true,
      output: { outputKey, bucket: outputBucket, format },
      processingMs,
    };
  },
  {
    connection: redis,
    concurrency: 3,
    limiter: { max: 50, duration: 60_000 },
  },
);

activeWorkers.set({ queue: QUEUE }, 1);

worker.on('failed', (job, err) => {
  console.error(`[ImageWorker] Job ${job?.id} failed: ${err.message}`);
  jobsProcessed.inc({ queue: QUEUE, status: 'failed' });
  if (job && job.attemptsMade > 1) {
    jobRetries.inc({ queue: QUEUE }, job.attemptsMade - 1);
  }
});

worker.on('stalled', (jobId) => {
  console.warn(`[ImageWorker] Job ${jobId} stalled`);
});

worker.on('error', (err) => {
  console.error('[ImageWorker] Worker error', err);
});

console.log('[ImageWorker] Started, waiting for jobs...');

function shutdown() {
  activeWorkers.set({ queue: QUEUE }, 0);
  void worker.close().then(() => process.exit(0));
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
