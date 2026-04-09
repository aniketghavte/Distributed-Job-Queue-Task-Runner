'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function JobDetailPage() {
  const params = useParams();
  const queue = typeof params.queue === 'string' ? params.queue : '';
  const id = typeof params.id === 'string' ? params.id : '';

  const [data, setData] = useState<unknown>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!queue || !id) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/jobs/${encodeURIComponent(queue)}/${encodeURIComponent(id)}`);
        const j = await r.json();
        if (!r.ok) throw new Error((j as { error?: string }).error ?? 'Not found');
        if (!cancelled) {
          setData(j);
          setErr(null);
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Error');
      }
    };
    void tick();
    const t = setInterval(() => void tick(), 2000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [queue, id]);

  return (
    <main className="shell">
      <nav className="nav">
        <Link href="/">← Overview</Link>
      </nav>
      <h1 style={{ fontSize: '1.35rem', marginBottom: '1rem' }}>
        Job <code>{id}</code> <span style={{ color: 'var(--muted)' }}>({queue})</span>
      </h1>
      {err && <p style={{ color: 'var(--err)' }}>{err}</p>}
      <div className="job-detail card">
        <pre>{data ? JSON.stringify(data, null, 2) : 'Loading…'}</pre>
      </div>
    </main>
  );
}
