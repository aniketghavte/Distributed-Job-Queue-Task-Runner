import { internalApiBase } from '@/lib/apiBase';

const ALLOWED = new Set(['email', 'image', 'ai']);

type Ctx = { params: Promise<{ queue: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { queue } = await ctx.params;
  if (!ALLOWED.has(queue)) {
    return Response.json({ error: 'Invalid queue' }, { status: 400 });
  }
  const base = internalApiBase();
  const payload = await req.text();
  const res = await fetch(`${base}/jobs/${encodeURIComponent(queue)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    cache: 'no-store',
  });
  const body = await res.text();
  return new Response(body, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
