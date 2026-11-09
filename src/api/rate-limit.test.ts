import { describe, expect, it } from 'vitest';
import { createRateLimit, PRUNE_AT } from './rate-limit.js';

describe('the per-ip limit', () => {
  it('lets 10 calls per ip through in 15 minutes and refuses the 11th with 429', () => {
    let t = 0;
    const limit = createRateLimit(() => t);
    for (let i = 0; i < 10; i++) limit('203.0.113.7');
    expect(() => limit('203.0.113.7')).toThrow(expect.objectContaining({ status: 429 }));
    expect(() => limit('198.51.100.1')).not.toThrow();
    t = 15 * 60 * 1000;
    expect(() => limit('203.0.113.7')).not.toThrow();
  });

  it('names when to retry', () => {
    let t = 0;
    const limit = createRateLimit(() => t);
    for (let i = 0; i < 10; i++) limit('a');
    t = 60_000;
    expect(() => limit('a')).toThrow(expect.objectContaining({ retryAfter: 840 }));
  });

  it('drops expired windows once it holds PRUNE_AT ips, so the map stays bounded', () => {
    let t = 0;
    const limit = createRateLimit(() => t);
    for (let i = 0; i < PRUNE_AT; i++) limit(`10.0.${i >> 8}.${i & 255}`);
    expect(limit.size()).toBe(PRUNE_AT);
    t = 15 * 60 * 1000;
    limit('192.0.2.1');
    expect(limit.size()).toBe(1);
  });
});
