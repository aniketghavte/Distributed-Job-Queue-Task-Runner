/**
 * Server-side base URL for the Express API (use service name in Docker).
 */
export function internalApiBase(): string {
  return (
    process.env.INTERNAL_API_URL?.replace(/\/$/, '') ??
    process.env.API_URL?.replace(/\/$/, '') ??
    'http://127.0.0.1:3001'
  );
}
