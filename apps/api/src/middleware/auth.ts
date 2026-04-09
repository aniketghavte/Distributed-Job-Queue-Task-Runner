import type { RequestHandler } from 'express';

/**
 * Optional API key: set API_KEY in production. When unset, auth is skipped (local dev).
 */
export const apiKeyAuth: RequestHandler = (req, res, next) => {
  const expected = process.env.API_KEY;
  if (!expected || expected.length === 0) {
    next();
    return;
  }
  const key = req.header('x-api-key') ?? req.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!key || key !== expected) {
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid or missing API key' });
    return;
  }
  next();
};
