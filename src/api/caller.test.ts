import { createTestContext, startTestServer, type Caller } from '@agentage/extension';
import { afterAll, describe, expect, it } from 'vitest';
import { create } from './index.js';

const READ: Caller = { sub: 'usr_r', scopes: ['root:read', 'other:admin'] };
const ctx = createTestContext();
const get = async (caller: Caller | null) => {
  const server = await startTestServer({ create, ctx, caller });
  const res = await server.fetch('/api/root/caller');
  await server.close();
  return { status: res.status, body: await res.json() };
};

describe('GET /api/root/caller (kit built-in)', () => {
  afterAll(() => ctx.close());

  it('names the caller and only its own root scopes', async () => {
    expect(await get(READ)).toEqual({
      status: 200,
      body: { success: true, data: { sub: 'usr_r', scopes: ['root:read'] } },
    });
  });

  it('answers 401 with no token', async () => {
    expect((await get(null)).status).toBe(401);
  });
});
