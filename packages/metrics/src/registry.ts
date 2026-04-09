import { Registry, Counter, Histogram, Gauge } from 'prom-client';

export const register = new Registry();

export const jobsProcessed = new Counter({
  name: 'bullmq_jobs_processed_total',
  help: 'Total jobs processed',
  labelNames: ['queue', 'status'],
  registers: [register],
});

export const jobDuration = new Histogram({
  name: 'bullmq_job_duration_seconds',
  help: 'Job processing time in seconds',
  labelNames: ['queue'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  registers: [register],
});

export const queueDepth = new Gauge({
  name: 'bullmq_queue_depth',
  help: 'Current number of waiting jobs per queue',
  labelNames: ['queue'],
  registers: [register],
});

export const activeWorkers = new Gauge({
  name: 'bullmq_active_workers',
  help: 'Number of active worker instances (set by worker process)',
  labelNames: ['queue'],
  registers: [register],
});

export const jobRetries = new Counter({
  name: 'bullmq_job_retries_total',
  help: 'Total job retry attempts after failure',
  labelNames: ['queue'],
  registers: [register],
});
