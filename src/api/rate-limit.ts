import { fail } from '@agentage/extension';

const WINDOW_MS = 15 * 60 * 1000;
const MAX = 10;

// web security.ts: 10 per 15 min per ip; one fixed window for all ips, cleared on roll, so it stays bounded.
export const createRateLimit = (now = () => Date.now()) => {
  let start = now();
  const counts = new Map<string, number>();
  return (ip: string): void => {
    const t = now();
    if (t - start >= WINDOW_MS) {
      start = t;
      counts.clear();
    }
    const count = (counts.get(ip) ?? 0) + 1;
    counts.set(ip, count);
    if (count <= MAX) return;
    const retryAfter = Math.ceil((start + WINDOW_MS - t) / 1000);
    throw fail('RATE_LIMITED', 'Too many requests, try again later', { retryAfter });
  };
};
