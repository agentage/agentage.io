import { fail } from '@agentage/extension';

const WINDOW_MS = 15 * 60 * 1000;
const MAX = 10;
// Past this many ips the expired windows are dropped, so the map stays bounded.
export const PRUNE_AT = 10_000;

interface Window {
  start: number;
  count: number;
}

const prune = (windows: Map<string, Window>, t: number) => {
  for (const [ip, w] of windows) if (t - w.start >= WINDOW_MS) windows.delete(ip);
};

// web security.ts: 10 per 15 min per IP on the waitlist routes; one window per ip, in this process.
export const createRateLimit = (now = () => Date.now()) => {
  const windows = new Map<string, Window>();
  const limit = (ip: string): void => {
    const t = now();
    if (windows.size >= PRUNE_AT) prune(windows, t);
    const w = windows.get(ip);
    if (!w || t - w.start >= WINDOW_MS) return void windows.set(ip, { start: t, count: 1 });
    if (++w.count <= MAX) return;
    const retryAfter = Math.ceil((w.start + WINDOW_MS - t) / 1000);
    throw fail('RATE_LIMITED', 'Too many requests, try again later', { retryAfter });
  };
  return Object.assign(limit, { size: () => windows.size });
};
