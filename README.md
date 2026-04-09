# Distributed Job Queue and Task Runner

Production-style distributed job processing system built with Node.js, TypeScript, BullMQ, Redis, and Next.js.

## Why this project

Modern products do not process every task in the request-response path. Expensive operations (emails, image processing, AI tasks) are queued and executed asynchronously by workers.

This project demonstrates:

- Producer-consumer architecture with BullMQ
- Retry and exponential backoff strategy
- Dead-letter style failed-job retention
- Real-time queue monitoring with WebSocket updates
- Prometheus metrics and Grafana dashboards
- Dockerized local infrastructure and CI pipeline

## Tech stack

- Backend: Node.js, Express, TypeScript
- Queue: BullMQ, Redis
- Workers: BullMQ workers (email, image, AI)
- Frontend: Next.js dashboard
- Observability: Prometheus, Grafana
- Tooling: Turborepo, Docker Compose, GitHub Actions

## Repository structure

```text
distributed-job-queue/
├── apps/
│   ├── api/                # Express API + WebSocket + metrics endpoint
│   ├── workers/            # Email/Image/AI worker processes
│   └── dashboard/          # Next.js monitoring dashboard
├── packages/
│   ├── queue-config/       # Shared Redis and queue definitions
│   └── metrics/            # Shared Prometheus metric registry
└── infra/
    ├── docker-compose.yml
    ├── prometheus.yml
    └── grafana/
```

## API features

- `POST /jobs/email` enqueue email job
- `POST /jobs/image` enqueue image processing job
- `POST /jobs/ai` enqueue AI task (supports delay)
- `GET /jobs/:queue/:id` job status and result
- `GET /jobs/:queue/stats` queue counters
- `GET /queues` all queue snapshots
- `GET /health` health check
- `GET /metrics` Prometheus scrape endpoint
- `WS /live` real-time queue events

## Prerequisites

- Node.js 20+
- npm 10+
- Docker Desktop (recommended for Redis and observability)

## Quick start (local process mode)

1. Install dependencies:

```bash
npm install
```

2. Build the workspace:

```bash
npm run build
```

3. Start Redis:

```bash
docker run -d --name djq-redis -p 6379:6379 redis:7-alpine
```

4. Start services in separate terminals:

```bash
# Terminal 1 - API
npm run start -w @repo/api
```

```bash
# Terminal 2 - Worker email
npm run start:email -w @repo/workers
```

```bash
# Terminal 3 - Worker image
npm run start:image -w @repo/workers
```

```bash
# Terminal 4 - Worker AI
npm run start:ai -w @repo/workers
```

```bash
# Terminal 5 - Dashboard
npm run start -w @repo/dashboard
```

5. Open these URLs:

- Dashboard: `http://localhost:3000`
- API health: `http://localhost:3001/health`
- API metrics: `http://localhost:3001/metrics`

## Full stack with Docker Compose

Run Redis, API, workers, dashboard, Prometheus, and Grafana:

```bash
docker compose -f infra/docker-compose.yml up --build
```

Then open:

- Dashboard: `http://localhost:3000`
- API: `http://localhost:3001`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3002` (`admin` / `admin`)

## Environment variables

Use `.env.example` as reference.

Important variables:

- `REDIS_HOST` (default `127.0.0.1`)
- `REDIS_PORT` (default `6379`)
- `PORT` for API (default `3001`)
- `INTERNAL_API_URL` for dashboard server-side proxy
- `NEXT_PUBLIC_WS_URL` for browser WebSocket connection
- `API_KEY` optional API protection
- `SIMULATE_EMAIL_FAILURE=1` to demo retry behavior

## Development commands

```bash
npm run build
npm run lint
npm run test
npm run dev:api
npm run dev:dashboard
```

Worker dev mode:

```bash
npm run dev:email -w @repo/workers
npm run dev:image -w @repo/workers
npm run dev:ai -w @repo/workers
```

## Security and reliability practices

- Request validation with Zod
- Optional API key authentication
- Rate limiting on APIs
- Secure headers with Helmet
- Retry and backoff policy
- Failed-job retention for debugging
- Metrics for throughput, latency, queue depth, retries

## Portfolio and resume highlight

Built a production-style distributed job queue platform using BullMQ and Redis with multi-queue workers, retries with exponential backoff, real-time monitoring, and Prometheus/Grafana observability.
