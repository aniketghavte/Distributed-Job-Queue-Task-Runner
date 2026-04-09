# Architecture - Distributed Job Queue and Task Runner

## Overview

This system separates synchronous API traffic from asynchronous background processing.  
Clients submit tasks to the API, tasks are queued in Redis via BullMQ, workers consume jobs independently, and a dashboard exposes operational visibility.

## High-level architecture

```text
Client (Dashboard / API Consumer)
        |
        | HTTP + WebSocket
        v
Express API (Producer + Status APIs + /metrics + /live)
        |
        | BullMQ enqueue
        v
Redis (BullMQ backend)
        |
        | BullMQ dequeue
        v
Workers (email / image / ai)
        |
        | Prometheus metrics
        v
Prometheus ---> Grafana
```

## Service responsibilities

### 1) API service (`apps/api`)

- Accepts job submissions
- Validates payloads using Zod
- Applies API key auth (optional) and rate limits
- Exposes job and queue status APIs
- Streams queue events via WebSocket (`/live`)
- Exposes Prometheus metrics (`/metrics`)

Key endpoints:
- `POST /jobs/email`
- `POST /jobs/image`
- `POST /jobs/ai`
- `GET /jobs/:queue/:id`
- `GET /jobs/:queue/stats`
- `GET /queues`
- `GET /health`
- `GET /metrics`

### 2) Queue layer (`packages/queue-config`)

- Shared Redis connection setup
- Central queue declarations:
  - `email`
  - `image`
  - `ai`
- Shared default job options:
  - retries (`attempts`)
  - exponential backoff
  - completed/failed job retention limits
- Queue event streams used by WebSocket layer

### 3) Worker service (`apps/workers`)

Independent worker processes consume queue jobs:
- `emailWorker`: send-email simulation, progress updates, retry demo support
- `imageWorker`: simulated transform + output artifact metadata
- `aiWorker`: summarize/embed/classify simulation with progress stages

Worker concerns:
- bounded concurrency per queue
- queue-level limiter (where configured)
- per-worker metrics server on `/metrics`
- graceful shutdown hooks

### 4) Dashboard service (`apps/dashboard`)

- Next.js UI for queue health and job visibility
- BFF API routes that proxy to API service
- Live feed using WebSocket events
- Job detail screen with polling
- Metrics page linking Prometheus/Grafana

### 5) Observability (`packages/metrics`, `infra/`)

Prometheus metrics currently include:
- `bullmq_jobs_processed_total`
- `bullmq_job_duration_seconds`
- `bullmq_queue_depth`
- `bullmq_active_workers`
- `bullmq_job_retries_total`

Prometheus scrapes:
- API metrics (`api:3001/metrics`)
- worker metrics (`worker-email:9101`, `worker-image:9102`, `worker-ai:9103`)

Grafana:
- provisioned Prometheus datasource
- starter dashboard (`bullmq-overview.json`)

## Runtime data flow

1. Client submits job to API (`POST /jobs/:queue`)
2. API validates payload and enqueues job
3. BullMQ stores job in Redis
4. Worker pulls job, updates progress, executes handler
5. Result/failed state is persisted by BullMQ
6. API status endpoints expose current state
7. Queue events are pushed to WebSocket clients
8. Metrics are scraped and visualized in Grafana

## Reliability model

- Retry with exponential backoff to protect downstream systems
- Failed jobs retained for inspection and replay workflows
- Rate limiting at API and worker layers
- Queue depth and processing duration exposed for alerting

## Security model (current)

- Helmet enabled on API
- Optional API key guard (`API_KEY`)
- Input validation for all job submission payloads
- Request-size limit on JSON body parser

## Deployment model

### Local (process mode)

- Redis via Docker or local install
- API + workers + dashboard started as separate processes

### Local/CI (container mode)

- `infra/docker-compose.yml` runs full stack:
  - Redis
  - API
  - workers
  - dashboard
  - Prometheus
  - Grafana

## Known trade-offs and future improvements

- Redis in compose uses memory eviction policy suitable for demo constraints; production should prefer queue-safe settings and sizing strategy.
- AI/image handlers are simulated and can be replaced with real providers (OpenAI/Ollama/S3 pipeline).
- Add explicit idempotency keys and replay tooling for stronger production semantics.
- Add alert rules (Prometheus Alertmanager) for queue depth/failure spikes.
