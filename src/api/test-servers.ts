import { createTestContext, startTestServer, type Caller } from '@agentage/extension';
import { vi } from 'vitest';
import { create } from './index.js';

export const SECRET = 'test-unsubscribe-secret';
export const ORIGIN = 'https://next.example.test';
const ADMIN: Caller = { sub: 'usr_admin', scopes: ['root:admin'] };
const READER: Caller = { sub: 'usr_reader', scopes: ['root:read'] };

// One store, three callers: anonymous, root:read and root:admin, each scope checked by the kit.
export const startServers = async (secrets: Record<string, string>) => {
  const ctx = createTestContext({
    extension: { origin: ORIGIN },
    secrets,
    settings: { mailFrom: 'AgentAge Memory <no-reply@mail.example.test>' },
  });
  await ctx.store.query('select 1');
  const start = (caller: Caller | null) => startTestServer({ create, ctx, caller });
  const [anon, reader, admin] = await Promise.all([start(null), start(READER), start(ADMIN)]);
  const close = () => Promise.all([anon, reader, admin].map((s) => s.close())).then(ctx.close);
  return { ctx, anon, reader, admin, close };
};

// Resend calls are recorded and answered with status; every other fetch goes out as usual.
export const stubResend = (status = 200, body = '{}') => {
  const real = globalThis.fetch;
  const calls: { url: string; init: RequestInit }[] = [];
  vi.stubGlobal('fetch', (url: string | URL, init: RequestInit = {}) => {
    if (!String(url).startsWith('https://api.resend.com/')) return real(url, init);
    calls.push({ url: String(url), init });
    return Promise.resolve(new Response(body, { status }));
  });
  return calls;
};

// Each call from its own address, so the per-ip limit never meets the suite's own calls.
let host = 0;
export const fromNewIp = () => ({ 'x-forwarded-for': `198.51.100.${(host = (host % 250) + 1)}` });

export const post = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'content-type': 'application/json', ...fromNewIp() },
  body: JSON.stringify(body),
});

export const settle = () => new Promise((resolve) => setTimeout(resolve, 20));
