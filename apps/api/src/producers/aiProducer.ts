import type { JobsOptions } from 'bullmq';
import { aiQueue } from '@repo/queue-config/queues';
import type { AiJobData } from '@repo/queue-config/jobTypes';

export function enqueueAi(data: AiJobData, opts?: JobsOptions) {
  return aiQueue.add('ai-task', data, opts);
}
