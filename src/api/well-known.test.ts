import { createHash } from 'node:crypto';
import { createTestContext, startTestServer } from '@agentage/extension';
import { describe, expect, it } from 'vitest';
import { create } from './index.js';

const PROOF = 'v=MCPv1; k=ed25519; p=AAAAC3NzaC1lZDI1NTE5AAAAIExampleKeyOnlyForTheTest';
const settings = {
  platform: 'https://platform.next.example.test',
  market: 'https://market.next.example.test',
  cloud: 'https://cloud.next.example.test',
  mcpRegistryAuth: ` ${PROOF} `,
};
const platform = { issuer: 'https://auth.example.test', audience: 'example.test' };

const serve = async (options: Parameters<typeof createTestContext>[0], path: string) => {
  const server = await startTestServer({
    create,
    ctx: createTestContext({ store: false, ...options }),
  });
  const res = await server.fetch(path);
  const body = res.status === 200 ? await res.text() : '';
  await server.close();
  return { res, body };
};

describe('/.well-known/agentage.json (C1)', () => {
  it('names issuer, platform, markets, cloud and telemetry, anonymous and CORS *', async () => {
    const telemetry = 'https://logs.example.test';
    const options = { settings, platform: { ...platform, telemetry } };
    const { res, body } = await serve(options, '/.well-known/agentage.json');
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    expect(JSON.parse(body)).toEqual({
      issuer: 'https://auth.example.test',
      platform: 'https://platform.next.example.test',
      markets: ['https://market.next.example.test'],
      cloud: 'https://cloud.next.example.test',
      telemetry,
    });
  });

  it('leaves telemetry out when the platform has none', async () => {
    const { body } = await serve({ settings, platform }, '/.well-known/agentage.json');
    expect(Object.keys(JSON.parse(body) as object)).not.toContain('telemetry');
  });
});

describe('/.well-known/mcp-registry-auth', () => {
  it('serves the setting byte for byte as the landing route did (trailing newline)', async () => {
    const { res, body } = await serve({ settings }, '/.well-known/mcp-registry-auth');
    expect(res.headers.get('content-type')).toMatch(/^text\/plain/);
    const sha = (text: string) => createHash('sha256').update(text).digest('hex');
    expect(sha(body)).toBe(sha(`${PROOF}\n`));
  });

  it('answers 404 while the setting is empty', async () => {
    const empty = { settings: { ...settings, mcpRegistryAuth: '' } };
    expect((await serve(empty, '/.well-known/mcp-registry-auth')).res.status).toBe(404);
  });
});

describe('the apex holds no account route', () => {
  it('answers 404 on /api/v1/machines, anonymous', async () => {
    const ctx = createTestContext({ store: false, settings });
    const server = await startTestServer({ create, ctx, caller: null });
    expect((await server.fetch('/api/v1/machines')).status).toBe(404);
    await server.close();
  });
});
