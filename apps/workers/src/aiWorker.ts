import { Worker, type Job } from 'bullmq';
import { redis } from '@repo/queue-config/redis';
import type { AiJobData, JobResult } from '@repo/queue-config/jobTypes';
import { jobsProcessed, jobDuration, activeWorkers, jobRetries } from '@repo/metrics';
import { startMetricsServer } from './metricsServer.js';

const QUEUE = 'ai';

const metricsPort = parseInt(process.env.WORKER_METRICS_PORT ?? '0', 10);
startMetricsServer(metricsPort, 'ai');

async function callLLM(content: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 1500));
  return `Summary of: ${content.slice(0, 50)}...`;
}

async function fakeEmbed(content: string): Promise<number[]> {
  await new Promise((r) => setTimeout(r, 800));
  const dim = 8;
  return Array.from({ length: dim }, (_, i) => (content.charCodeAt(i % content.length) % 97) / 97);
}

async function fakeClassify(content: string): Promise<{ label: string; score: number }> {
  await new Promise((r) => setTimeout(r, 600));
  return { label: content.length % 2 === 0 ? 'neutral' : 'signal', score: 0.92 };
}

const worker = new Worker<AiJobData, JobResult>(
  QUEUE,
  async (job: Job<AiJobData>): Promise<JobResult> => {
    const start = Date.now();

    await job.updateProgress({ step: 'validating', pct: 5 });

    const { type, content, callbackUrl } = job.data;

    if (type === 'summarize') {
      await job.updateProgress({ step: 'calling_llm', pct: 20 });
      const summary = await callLLM(content);
      await job.updateProgress({ step: 'storing_result', pct: 90 });

      if (callbackUrl) {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 10_000);
        try {
          await fetch(callbackUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId: job.id, result: summary }),
            signal: ctrl.signal,
          });
        } catch (e) {
          console.warn(`[AiWorker] callback failed for job ${job.id}`, e);
        } finally {
          clearTimeout(t);
        }
      }

      const processingMs = Date.now() - start;
      jobsProcessed.inc({ queue: QUEUE, status: 'completed' });
      jobDuration.observe({ queue: QUEUE }, processingMs / 1000);
      return { success: true, output: summary, processingMs };
    }

    if (type === 'embed') {
      await job.updateProgress({ step: 'embedding', pct: 40 });
      const vec = await fakeEmbed(content);
      await job.updateProgress({ step: 'done', pct: 100 });
      const processingMs = Date.now() - start;
      jobsProcessed.inc({ queue: QUEUE, status: 'completed' });
      jobDuration.observe({ queue: QUEUE }, processingMs / 1000);
      return { success: true, output: { dimensions: vec.length, vector: vec }, processingMs };
    }

    if (type === 'classify') {
      await job.updateProgress({ step: 'classify', pct: 40 });
      const out = await fakeClassify(content);
      await job.updateProgress({ step: 'done', pct: 100 });
      const processingMs = Date.now() - start;
      jobsProcessed.inc({ queue: QUEUE, status: 'completed' });
      jobDuration.observe({ queue: QUEUE }, processingMs / 1000);
      return { success: true, output: out, processingMs };
    }

    throw new Error(`Unknown AI job type: ${String(type)}`);
  },
  { connection: redis, concurrency: 2 },
);

activeWorkers.set({ queue: QUEUE }, 1);

worker.on('failed', (job, err) => {
  console.error(`[AiWorker] Job ${job?.id} failed: ${err.message}`);
  jobsProcessed.inc({ queue: QUEUE, status: 'failed' });
  if (job && job.attemptsMade > 1) {
    jobRetries.inc({ queue: QUEUE }, job.attemptsMade - 1);
  }
});

worker.on('error', (err) => {
  console.error('[AiWorker] Worker error', err);
});

console.log('[AiWorker] Started, waiting for jobs...');

function shutdown() {
  activeWorkers.set({ queue: QUEUE }, 0);
  void worker.close().then(() => process.exit(0));
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
