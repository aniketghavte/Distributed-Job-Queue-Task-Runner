import Link from 'next/link';

export default function MetricsPage() {
  const grafana = process.env.GRAFANA_PUBLIC_URL ?? 'http://localhost:3002';
  const prometheus = process.env.PROMETHEUS_PUBLIC_URL ?? 'http://localhost:9090';
  const apiMetrics = process.env.API_METRICS_PUBLIC_URL ?? 'http://localhost:3001/metrics';

  return (
    <main className="shell">
      <nav className="nav">
        <Link href="/">← Overview</Link>
      </nav>
      <header className="hero">
        <h1>Observability</h1>
        <p>
          Prometheus scrapes the API (queue depth) and each worker (throughput, latency, retries). Grafana ships
          with a starter dashboard in <code>infra/grafana/</code>.
        </p>
      </header>
      <div className="metrics-links">
        <a href={grafana} target="_blank" rel="noreferrer">
          Grafana ({grafana})
        </a>
        <a href={prometheus} target="_blank" rel="noreferrer">
          Prometheus ({prometheus})
        </a>
        <a href={apiMetrics} target="_blank" rel="noreferrer">
          API metrics
        </a>
      </div>
      <p style={{ marginTop: '2rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
        In Docker Compose, Grafana is on port <strong>3002</strong> so it does not clash with Next.js on 3000.
        Default login: <code>admin</code> / <code>admin</code>.
      </p>
    </main>
  );
}
