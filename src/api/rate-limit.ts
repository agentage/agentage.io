import { fail } from '@agentage/extension';

const WINDOW_MS = 15 * 60 * 1000;
const MAX = 10;

// web security.ts: 10 per 15 min per IP on the waitlist routes; one window per ip, in this process.
export const createRateLimit = (now = () => Date.now()) => {
  const windows = new Map<string, { start: number; count: number }>();
  return (ip: string): void => {
    const t = now();
    const w = windows.get(ip);
    if (!w || t - w.start >= WINDOW_MS) return void windows.set(ip, { start: t, count: 1 });
    if (++w.count <= MAX) return;
    const retryAfter = Math.ceil((w.start + WINDOW_MS - t) / 1000);
    throw fail('RATE_LIMITED', 'Too many requests, try again later', { retryAfter });
  };
};
