import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { signEmail } from './unsubscribe-token.js';
import { fromNewIp, post, SECRET, settle, startServers, stubResend } from './test-servers.js';

let s: Awaited<ReturnType<typeof startServers>>;
const real = globalThis.fetch;
beforeAll(async () => {
  s = await startServers({ resend: 're_test_key', unsubscribe: SECRET });
}, 30_000);
afterAll(() => s.close());
afterEach(async () => {
  vi.unstubAllGlobals();
  await s.ctx.store.query('delete from subscribers');
});

const join = (body: unknown) => s.anon.fetch('/api/v1/subscribers', post(body));
const rows = async () =>
  (await s.ctx.store.query('select * from subscribers order by created_at')).rows;

describe('POST /api/v1/subscribers', () => {
  it('stores a valid email and answers the row with 201', async () => {
    stubResend();
    const res = await join({ email: 'alice@example.com' });
    const { data } = (await res.json()) as { data: { id: string; email: string } };
    expect(res.status).toBe(201);
    expect(data).toMatchObject({ email: 'alice@example.com', createdAt: expect.any(String) });
    expect((await rows()).map((r) => r['id'])).toEqual([data.id]);
  });

  it('normalizes a padded, mixed-case email', async () => {
    stubResend();
    await join({ email: '  Carol@Example.COM  ' });
    expect((await rows())[0]).toMatchObject({ email: 'carol@example.com' });
  });

  it("stores the form's context, drops its list field and takes ip and user agent from the request", async () => {
    stubResend();
    const utm = { source: 'twitter', campaign: 'launch' };
    const context = { utm, locale: 'en-US', timezone: 'Europe/Prague' };
    const init = post({ email: 'dana@example.com', list: 'news', tools: ['Claude'], ...context });
    init.headers = {
      ...init.headers,
      'x-forwarded-for': '203.0.113.7, 10.0.0.1',
      'user-agent': 'test-agent/1.0',
      referer: 'https://x.test',
    };
    await s.anon.fetch('/api/v1/subscribers', init);
    const row = (await rows())[0];
    expect(row).toMatchObject({
      ...context,
      referrer: 'https://x.test',
      user_agent: 'test-agent/1.0',
    });
    expect(row?.['ip']).toBe('203.0.113.7');
  });

  it.each([
    ['an invalid email', { email: 'not-an-email' }],
    ['no email', {}],
  ])('refuses %s with 400 and stores nothing', async (_name, body) => {
    const res = await join(body);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
    expect(await rows()).toEqual([]);
  });

  it('is idempotent by email: a repeat answers the first row and keeps its context', async () => {
    stubResend();
    const first = await (await join({ email: 'eve@example.com', locale: 'en' })).json();
    const repeat = await join({ email: 'EVE@example.com', locale: 'de' });
    expect(repeat.status).toBe(200);
    expect(await repeat.json()).toEqual(first);
    expect(await rows()).toHaveLength(1);
    expect((await rows())[0]).toMatchObject({ locale: 'en' });
  });
});

describe('the welcome mail', () => {
  it('goes to Resend once for a new row, never for a repeat', async () => {
    const calls = stubResend();
    await join({ email: 'fay@example.com' });
    await join({ email: 'fay@example.com' });
    await settle();
    expect(calls).toHaveLength(1);
    const [{ url, init }] = calls as [{ url: string; init: RequestInit }];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer re_test_key' });
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      to: ['fay@example.com'],
      from: expect.stringContaining('AgentAge'),
    });
    expect(body['subject']).toBe("You're on the AgentAge Memory waitlist");
  });

  it('carries the one-click unsubscribe headers and the page link on the root origin', async () => {
    const calls = stubResend();
    await join({ email: 'gil@example.com' });
    await settle();
    const body = JSON.parse(String(calls[0]?.init.body)) as Record<string, unknown>;
    const q = `?email=gil%40example.com&token=${signEmail('gil@example.com', SECRET)}`;
    expect(body['headers']).toEqual({
      'List-Unsubscribe': `<https://next.example.test/api/v1/subscribers/unsubscribe${q}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    });
    expect(body['text']).toContain('https://next.example.test/unsubscribe?email=gil%40example.com');
  });

  it('a Resend call that never answers does not hold the signup and is cut by a timeout', async () => {
    const signals: (AbortSignal | null | undefined)[] = [];
    vi.stubGlobal('fetch', (url: string | URL, init?: RequestInit) => {
      if (!String(url).startsWith('https://api.resend.com/')) return real(url, init);
      signals.push(init?.signal);
      return new Promise(() => {});
    });
    const res = await join({ email: 'hang@example.com' });
    expect(res.status).toBe(201);
    expect(signals[0]).toBeInstanceOf(AbortSignal);
  });

  it("a Resend failure is logged with Resend's answer and never fails the signup", async () => {
    stubResend(500);
    const res = await join({ email: 'hal@example.com' });
    await settle();
    expect(res.status).toBe(201);
    const errors = s.ctx.logs.filter((l) => l.level === 'error').map((l) => l.message);
    expect(errors).toContain('resend send failed (500): {}');
  });
});

describe('POST /api/v1/subscribers/unsubscribe?email&token', () => {
  const unsubscribe = (email: string, token: string) =>
    s.anon.fetch(
      `/api/v1/subscribers/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', ...fromNewIp() },
        body: 'List-Unsubscribe=One-Click',
      }
    );

  it('removes the row on a valid signed link, anonymously, as the RFC 8058 one-click', async () => {
    stubResend();
    await join({ email: 'ivy@example.com' });
    const res = await unsubscribe('Ivy@Example.com', signEmail('ivy@example.com', SECRET));
    expect(res.status).toBe(200);
    expect(await rows()).toEqual([]);
  });

  it('refuses a forged token with 400 and keeps the row', async () => {
    stubResend();
    await join({ email: 'jo@example.com' });
    const res = await unsubscribe('jo@example.com', 'forged');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toMatchObject({ error: { code: 'INVALID_UNSUBSCRIBE_LINK' } });
    expect(await rows()).toHaveLength(1);
  });

  it.each([
    ['an oversized email', 'x'.repeat(330) + '@example.com', 'token'],
    ['an oversized token', 'jo@example.com', 'x'.repeat(200)],
    ['no email', '', 'token'],
  ])('answers INVALID_UNSUBSCRIBE_LINK for %s', async (_name, email, token) => {
    const res = await unsubscribe(email, token);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: { code: 'INVALID_UNSUBSCRIBE_LINK' } });
  });

  it('answers 200 for an address that is not on the list', async () => {
    const res = await unsubscribe('nobody@example.com', signEmail('nobody@example.com', SECRET));
    expect(res.status).toBe(200);
  });
});

describe('the per-ip limit', () => {
  it('refuses the 11th call from one address in 15 minutes with 429', async () => {
    stubResend();
    const ip = { 'x-forwarded-for': '192.0.2.99' };
    const call = (i: number) =>
      s.anon.fetch('/api/v1/subscribers', {
        ...post({ email: `r${i}@example.com` }),
        headers: { 'content-type': 'application/json', ...ip },
      });
    for (let i = 0; i < 9; i++) expect((await call(i)).status).toBe(201);
    // An invalid body counts too: the limit runs before the email check, as in web.
    const bad = {
      ...post({ email: 'nope' }),
      headers: { 'content-type': 'application/json', ...ip },
    };
    expect((await s.anon.fetch('/api/v1/subscribers', bad)).status).toBe(400);
    const res = await call(10);
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBeTruthy();
  });

  it('never refuses a valid unsubscribe link, so one-clicks from a shared ip all land', async () => {
    const ip = { 'x-forwarded-for': '192.0.2.98' };
    const call = (email: string, token: string) =>
      s.anon.fetch(`/api/v1/subscribers/unsubscribe?email=${email}&token=${token}`, {
        method: 'POST',
        headers: ip,
      });
    for (let i = 0; i < 10; i++) expect((await call('bad@example.com', 'x')).status).toBe(400);
    expect((await call('bad@example.com', 'x')).status).toBe(429);
    const good = await call('ok@example.com', signEmail('ok@example.com', SECRET));
    expect(good.status).toBe(200);
  });
});
