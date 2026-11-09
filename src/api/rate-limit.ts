import { fail } from '@agentage/extension';

const WINDOW_MS = 15 * 60 * 1000;
const MAX = 10;

interface Window {
  start: number;
  count: number;
}

// web security.ts: 10 per 15 min per ip; ended windows are swept once per window, so the map stays bounded.
export const createRateLimit = (now = () => Date.now()) => {
  const windows = new Map<string, Window>();
  let swept = now();
  const limit = (ip: string): void => {
    const t = now();
    if (t - swept >= WINDOW_MS) {
      swept = t;
      for (const [key, w] of windows) if (t - w.start >= WINDOW_MS) windows.delete(key);
    }
    const w = windows.get(ip);
    if (!w || t - w.start >= WINDOW_MS) return void windows.set(ip, { start: t, count: 1 });
    if (++w.count <= MAX) return;
    const retryAfter = Math.ceil((w.start + WINDOW_MS - t) / 1000);
    throw fail('RATE_LIMITED', 'Too many requests, try again later', { retryAfter });
  };
  return Object.assign(limit, { size: () => windows.size });
};
