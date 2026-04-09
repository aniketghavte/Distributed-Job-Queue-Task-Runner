'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

interface QueueStats {
  queue: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

type LiveLine = { id: string; text: string };

function wsUrl(): string {
  if (typeof window === 'undefined') return '';
  return process.env.NEXT_PUBLIC_WS_URL ?? `ws://${window.location.hostname}:3001/live`;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<QueueStats[]>([]);
  const [live, setLive] = useState<LiveLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const queues = ['email', 'image', 'ai'];
      const results = await Promise.all(
        queues.map((q) => fetch(`/api/jobs/${q}/stats`).then((r) => r.json() as Promise<QueueStats>)),
      );
      setStats(results);
      setError(null);
    } catch {
      setError('Could not reach API (is Redis + API running?)');
    }
  }, []);

  useEffect(() => {
    void fetchStats();
    const interval = setInterval(() => void fetchStats(), 3000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  useEffect(() => {
    const url = wsUrl();
    if (!url) return;

    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      return;
    }
    wsRef.current = ws;

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as {
          type?: string;
          queue?: string;
          event?: string;
          jobId?: string;
          at?: number;
        };
        if (msg.type !== 'job') return;
        const line = `[${msg.queue}] ${msg.event}${msg.jobId ? ` #${msg.jobId}` : ''}`;
        const id = `${msg.at}-${msg.jobId}-${msg.event}`;
        setLive((prev) => [{ id, text: line }, ...prev].slice(0, 40));
      } catch {
        /* ignore */
      }
    };

    ws.onerror = () => {
      /* browser WS errors are opaque; UI still polls */
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, []);

  return (
    <main className="shell">
      <section className="demo-banner">
        <p>
          <strong>Product demo only:</strong> This is a portfolio showcase build and is not intended for heavy
          production traffic.
        </p>
        <p>
          Built by <strong>Aniket Ghavte</strong> · <a href="https://aniketghavte.xyz">aniketghavte.xyz</a> ·{' '}
          <a href="https://github.com/aniketghavte/Distributed-Job-Queue-Task-Runner">GitHub</a>
        </p>
      </section>

      <nav className="nav">
        <Link href="/">Overview</Link>
        <Link href="/metrics">Observability</Link>
      </nav>

      <header className="hero">
        <h1>Distributed Job Queue Platform</h1>
        <p>
          A minimal, production-style async processing system using BullMQ and Redis. Monitor queue health, trigger
          jobs, and watch live worker events in one place.
        </p>
      </header>

      <section className="panel card architecture-story">
        <details>
          <summary>
            <span>Click here to see the architecture and story</span>
            <span className="summary-hint">How it works · Why it matters · Why I built this</span>
          </summary>

          <div className="story-content">
            <pre className="flow-diagram">
{`Client / Dashboard
       |
       | HTTP + WebSocket
       v
API (Express + BullMQ Producer)
       |
       v
Redis Queue (email / image / ai)
       |
       v
Workers (email, image, ai)
       |
       v
Prometheus --> Grafana`}
            </pre>

            <p>
              If I explain this like I am talking to you directly: this system is built so the app does not freeze
              when heavy work comes in. Instead of doing everything in one API request, I push jobs to queues and let
              background workers process them safely.
            </p>
            <p>
              <strong>How it works:</strong> the API receives a task, validates it, and puts it in Redis via BullMQ.
              Dedicated workers pick jobs by queue type (email, image, AI), execute them with retries and backoff, and
              report status. The dashboard shows current queue health and live events.
            </p>
            <p>
              <strong>How it benefits:</strong> fast user response times, better reliability when failures happen,
              safer retry behavior, and clear visibility through metrics. This is the same mindset used in real
              product teams when they handle async workloads.
            </p>
            <p>
              <strong>What makes it different and unique:</strong> this is not just a basic queue demo. It combines
              multi-queue processing, real-time event streaming, observability with Prometheus/Grafana, and a polished
              monitoring UI in one system.
            </p>
            <p>
              <strong>Why I made this:</strong> I wanted to showcase real backend engineering ownership end-to-end, not
              only API coding. This project demonstrates how I design systems that are scalable, observable, and ready
              for production-style traffic patterns.
            </p>
          </div>
        </details>
      </section>

      {error && (
        <p style={{ color: 'var(--err)', marginBottom: '1rem' }} role="alert">
          {error}
        </p>
      )}

      <div className="grid">
        {stats.map((s) => (
          <QueueCard key={s.queue} stats={s} />
        ))}
      </div>

      <section className="panel feature-grid">
        <article className="card feature-card">
          <h3>What this demo shows</h3>
          <p>
            Decoupling heavy tasks from request-response flows so APIs stay responsive while workers process jobs in
            the background.
          </p>
        </article>
        <article className="card feature-card">
          <h3>Queues and workers</h3>
          <p>
            Separate queues for <strong>email</strong>, <strong>image</strong>, and <strong>AI</strong> with retries,
            progress updates, and queue-specific concurrency controls.
          </p>
        </article>
        <article className="card feature-card">
          <h3>Observability</h3>
          <p>
            Metrics are exported to Prometheus and visualized in Grafana for throughput, queue depth, latency, and
            retry behavior.
          </p>
        </article>
      </section>

      <section className="panel card">
        <h3>Quick submit actions</h3>
        <p className="subtle">Use these actions to generate queue traffic and see real-time updates below.</p>
        <QuickSubmit onSubmitted={() => void fetchStats()} />
      </section>

      <section className="panel">
        <h3 style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>Live event stream · WebSocket `/live`</h3>
        <div className="live" aria-live="polite">
          {live.length === 0 ? (
            <div className="evt">Waiting for queue events…</div>
          ) : (
            live.map((l) => (
              <div key={l.id} className="evt">
                {l.text}
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

function QueueCard({ stats }: { stats: QueueStats }) {
  const q = stats.queue;
  return (
    <div className="card">
      <h2>
        <span className={`badge ${q}`}>{q}</span> queue
      </h2>
      <div className="stat-grid">
        {[
          { label: 'Waiting', value: stats.waiting, color: 'var(--warn)' },
          { label: 'Active', value: stats.active, color: 'var(--blue)' },
          { label: 'Done', value: stats.completed, color: 'var(--ok)' },
          { label: 'Failed', value: stats.failed, color: 'var(--err)' },
          { label: 'Delayed', value: stats.delayed, color: 'var(--muted)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="stat">
            <label>{label}</label>
            <strong style={{ color }}>{value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickSubmit({ onSubmitted }: { onSubmitted: () => void }) {
  const [loading, setLoading] = useState(false);
  const [last, setLast] = useState<{ queue: string; jobId: string } | string | null>(null);

  const post = async (queue: string, body: object) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/jobs/${queue}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as { jobId?: string; error?: string };
      if (!r.ok) throw new Error(j.error ?? r.statusText);
      const jobId = j.jobId;
      if (jobId) setLast({ queue, jobId });
      else setLast('Missing job id');
      onSubmitted();
    } catch (e) {
      setLast(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="form-row">
        <button type="button" disabled={loading} onClick={() => void post('email', sampleEmail())}>
          Enqueue email
        </button>
        <button type="button" disabled={loading} onClick={() => void post('image', sampleImage())}>
          Enqueue image
        </button>
        <button type="button" disabled={loading} onClick={() => void post('ai', sampleAi())}>
          Enqueue AI summarize
        </button>
      </div>
      {last && (
        <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: 0 }}>
          Last response:{' '}
          {typeof last === 'string' ? (
            last
          ) : (
            <>
              <Link href={`/jobs/${last.queue}/${last.jobId}`}>view job</Link>
            </>
          )}
          {' · '}
          <Link href="/metrics">Observability</Link>
        </p>
      )}
    </div>
  );
}

function sampleEmail() {
  return {
    to: `demo+${Date.now()}@example.com`,
    subject: 'Portfolio demo job',
    body: 'Queued via distributed job queue dashboard.',
  };
}

function sampleImage() {
  return {
    sourceUrl: 'https://example.com/image.jpg',
    outputBucket: 'demo-bucket',
    resize: { width: 800, height: 600 },
    format: 'webp' as const,
  };
}

function sampleAi() {
  return {
    type: 'summarize' as const,
    content:
      'This is a sample paragraph for the AI worker. It simulates offloading LLM work from the request path.',
  };
}
