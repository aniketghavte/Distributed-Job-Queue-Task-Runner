import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { register } from '@repo/metrics';
import { initQueueEventListeners } from '@repo/queue-config/queues';
import jobsRouter from './routes/jobs.js';
import queuesRouter from './routes/queues.js';
import { apiKeyAuth } from './middleware/auth.js';
import { readLimiter } from './middleware/rateLimit.js';
import { attachLiveWebSocket } from './websocket.js';
import { startQueueDepthPoller } from './queueMetricsPoller.js';

const app = express();
const port = parseInt(process.env.PORT ?? '3001', 10);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()) ?? true,
    credentials: true,
  }),
);
app.use(express.json({ limit: '512kb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'distributed-job-queue-api' });
});

app.get('/metrics', readLimiter, async (_req, res, next) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (e) {
    next(e);
  }
});

app.use(apiKeyAuth);

app.use('/jobs', readLimiter, jobsRouter);
app.use('/queues', readLimiter, queuesRouter);

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error('[api]', err);
    res.status(500).json({ error: 'Internal server error' });
  },
);

const server = http.createServer(app);

async function main() {
  await initQueueEventListeners();
  attachLiveWebSocket(server);
  const stopPoller = startQueueDepthPoller();

  server.listen(port, () => {
    console.log(`[api] listening on http://0.0.0.0:${port}`);
    console.log(`[api] WebSocket live at ws://0.0.0.0:${port}/live`);
  });

  const shutdown = () => {
    stopPoller();
    server.close(() => process.exit(0));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
