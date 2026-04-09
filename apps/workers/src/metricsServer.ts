import http from 'http';
import { register } from '@repo/metrics';

export function startMetricsServer(port: number, name: string): void {
  if (!Number.isFinite(port) || port <= 0) return;

  const server = http.createServer(async (req, res) => {
    if (req.url !== '/metrics') {
      res.statusCode = 404;
      res.end();
      return;
    }
    try {
      res.setHeader('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (e) {
      console.error(`[metrics:${name}]`, e);
      res.statusCode = 500;
      res.end();
    }
  });

  server.listen(port, () => {
    console.log(`[metrics:${name}] listening on :${port}`);
  });
}
