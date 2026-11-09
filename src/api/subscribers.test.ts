import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { signEmail } from './unsubscribe-token.js';
import { post, SECRET, settle, startServers, stubResend } from './test-servers.js';

let s: Awaited<ReturnType<typeof startServers>>;
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
  it('stores a valid email and answers the row', async () => {
    stubResend();
    const res = await join({ email: 'alice@example.com' });
    const { data } = (await res.json()) as { data: { id: string; email: string } };
    expect(res.status).toBe(200);
    expect(data).toMatchObject({ email: 'alice@example.com', createdAt: expect.any(String) });
    expect((await rows()).map((r) => r['id'])).toEqual([data.id]);
  });

  it('normalizes a padded, mixed-case email', async () => {
    stubResend();
    await join({ email: '  Carol@Example.COM  ' });
    expect((await rows())[0]).toMatchObject({ email: 'carol@example.com' });
  });

  it("stores the form's context and drops its list field", async () => {
    stubResend();
    const utm = { source: 'twitter', campaign: 'launch' };
    const context = { tools: ['Claude'], utm, locale: 'en-US', timezone: 'Europe/Prague' };
    await join({ email: 'dana@example.com', list: 'news', referrer: 'https://x.test', ...context });
    expect((await rows())[0]).toMatchObject({ ...context, referrer: 'https://x.test', ip: null });
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
    const again = await (await join({ email: 'EVE@example.com', locale: 'de' })).json();
    expect(again).toEqual(first);
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
    const q = `gil%40example.com/${signEmail('gil@example.com', SECRET)}`;
    expect(body['headers']).toEqual({
      'List-Unsubscribe': `<https://next.example.test/api/v1/subscribers/unsubscribe/${q}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    });
    expect(body['text']).toContain('https://next.example.test/unsubscribe?email=gil%40example.com');
  });

  it('a Resend failure is logged and never fails the signup', async () => {
    stubResend(500);
    const res = await join({ email: 'hal@example.com' });
    await settle();
    expect(res.status).toBe(200);
    expect(s.ctx.logs.some((l) => l.level === 'error')).toBe(true);
  });
});

describe('POST /api/v1/subscribers/unsubscribe/{email}/{token}', () => {
  const unsubscribe = (email: string, token: string) =>
    s.anon.fetch(`/api/v1/subscribers/unsubscribe/${encodeURIComponent(email)}/${token}`, {
      method: 'POST',
    });

  it('removes the row on a valid signed link, anonymously', async () => {
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
    expect(body).toMatchObject({ error: { details: [{ message: 'INVALID_UNSUBSCRIBE_LINK' }] } });
    expect(await rows()).toHaveLength(1);
  });

  it('answers 200 for an address that is not on the list', async () => {
    const res = await unsubscribe('nobody@example.com', signEmail('nobody@example.com', SECRET));
    expect(res.status).toBe(200);
  });
});
