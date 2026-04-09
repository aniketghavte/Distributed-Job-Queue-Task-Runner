export interface EmailJobData {
  to: string;
  subject: string;
  body: string;
  templateId?: string;
}

export interface ImageJobData {
  sourceUrl: string;
  outputBucket: string;
  resize: { width: number; height: number };
  format: 'webp' | 'jpeg' | 'png';
}

export interface AiJobData {
  type: 'summarize' | 'embed' | 'classify';
  content: string;
  model?: string;
  callbackUrl?: string;
}

export type JobResult = {
  success: boolean;
  output?: unknown;
  processingMs: number;
};

export type QueueName = 'email' | 'image' | 'ai';
