import type { JobsOptions } from 'bullmq';
import { emailQueue } from '@repo/queue-config/queues';
import type { EmailJobData } from '@repo/queue-config/jobTypes';

export function enqueueEmail(data: EmailJobData, opts?: JobsOptions) {
  return emailQueue.add('send-email', data, opts);
}
