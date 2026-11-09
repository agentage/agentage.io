import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { post, settle, startServers, stubResend } from './test-servers.js';

// resend off and no unsubscribe value: what next runs before the owner's Resend key (I4).
let s: Awaited<ReturnType<typeof startServers>>;
beforeAll(async () => {
  s = await startServers({ resend: 'off', unsubscribe: '' });
}, 30_000);
afterAll(() => s.close());
afterEach(() => vi.unstubAllGlobals());

const join = (email: string) => s.anon.fetch('/api/v1/subscribers', post({ email }));
type Page = { data: { email: string }[]; meta: { pagination: { nextCursor?: string } } };

describe('without a Resend key', () => {
  it('stores the row, sends nothing and logs the skip', async () => {
    const calls = stubResend();
    expect((await join('kim@example.com')).status).toBe(200);
    await settle();
    expect(calls).toEqual([]);
    expect(s.ctx.logs.some((l) => l.message === 'welcome mail skipped: no resend secret')).toBe(
      true
    );
  });

  it('refuses every unsubscribe link while no secret is set', async () => {
    const res = await s.anon.fetch('/api/v1/subscribers/unsubscribe/kim%40example.com/x', {
      method: 'POST',
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/subscribers', () => {
  beforeAll(async () => {
    await s.ctx.store.query('delete from subscribers');
    for (const [i, name] of ['old', 'mid', 'new'].entries())
      await s.ctx.store.query(
        `insert into subscribers (email, created_at) values ($1, now() + make_interval(secs => $2))`,
        [`${name}@example.com`, i]
      );
  });

  it.each([
    ['anonymous', 'anon', 401],
    ['root:read', 'reader', 403],
  ] as const)('refuses %s with %i', async (_name, who, status) => {
    expect((await s[who].fetch('/api/v1/subscribers')).status).toBe(status);
  });

  it('lists newest first for root:admin', async () => {
    const page = (await (await s.admin.fetch('/api/v1/subscribers')).json()) as Page;
    expect(page.data.map((r) => r.email)).toEqual([
      'new@example.com',
      'mid@example.com',
      'old@example.com',
    ]);
  });

  it('pages with an opaque cursor', async () => {
    const first = (await (await s.admin.fetch('/api/v1/subscribers?limit=2')).json()) as Page;
    const cursor = first.meta.pagination.nextCursor ?? '';
    const next = (await (
      await s.admin.fetch(`/api/v1/subscribers?limit=2&cursor=${cursor}`)
    ).json()) as Page;
    expect(next.data.map((r) => r.email)).toEqual(['old@example.com']);
    expect(next.meta.pagination.nextCursor).toBeUndefined();
  });

  it('refuses a cursor that names no row id with 400', async () => {
    const cursor = Buffer.from('nope').toString('base64url');
    expect((await s.admin.fetch(`/api/v1/subscribers?cursor=${cursor}`)).status).toBe(400);
  });
});
