import type { JobsOptions } from 'bullmq';
import { imageQueue } from '@repo/queue-config/queues';
import type { ImageJobData } from '@repo/queue-config/jobTypes';

export function enqueueImage(data: ImageJobData, opts?: JobsOptions) {
  return imageQueue.add('process-image', data, opts);
}
