import { internalApiBase } from '@/lib/apiBase';

type Ctx = { params: Promise<{ queue: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { queue } = await ctx.params;
  const base = internalApiBase();
  const res = await fetch(`${base}/jobs/${encodeURIComponent(queue)}/stats`, {
    cache: 'no-store',
  });
  const body = await res.text();
  return new Response(body, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
