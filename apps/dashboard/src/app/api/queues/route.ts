import { internalApiBase } from '@/lib/apiBase';

export async function GET() {
  const base = internalApiBase();
  const res = await fetch(`${base}/queues`, { cache: 'no-store' });
  const body = await res.text();
  return new Response(body, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
