import { readdirSync } from 'node:fs';
import { createTestContext } from '@agentage/extension';
import { describe, expect, it } from 'vitest';
import { create } from './index.js';

const ORIGIN = 'https://next.example.test';
const site = create({
  ...createTestContext(),
  extension: { ...createTestContext().extension, origin: ORIGIN },
});
const text = (path: string) => {
  const entry = site[path];
  expect(typeof entry).toBe('string');
  return entry as string;
};
const files = readdirSync('dist/pages/site', { recursive: true, withFileTypes: true });

describe('the pages site', () => {
  it('maps every exported file to one path', () => {
    expect(Object.keys(site)).toHaveLength(files.filter((e) => e.isFile()).length);
    expect(Object.keys(site)).toEqual(expect.arrayContaining(['/', '/blog', '/unsubscribe']));
  });

  it('serves robots.txt, the sitemap and the canonical on the origin', () => {
    expect(text('/robots.txt')).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`);
    expect(text('/sitemap.xml')).toContain(`<loc>${ORIGIN}/blog</loc>`);
    expect(text('/')).toContain(`<link rel="canonical" href="${ORIGIN}"`);
  });

  it('keeps no host token in any text entry', () => {
    const texts = Object.values(site).filter((entry) => typeof entry === 'string');
    expect(texts.filter((entry) => /site-fqdn\.sentinel\.invalid/i.test(entry))).toEqual([]);
  });

  it('types the images without an extension and keeps their bytes', () => {
    const og = site['/opengraph-image'] as { type: string; body: Uint8Array };
    expect(og.type).toBe('image/png');
    expect([...og.body.subarray(1, 4)]).toEqual([...Buffer.from('PNG')]);
    expect(site['/twitter-image']).toMatchObject({ type: 'image/png' });
  });

  it('serves the .md mirrors and leaves mcp-registry-auth to the api', () => {
    const md = Object.keys(site).filter((path) => /^\/blog\/[^/]+\.md$/.test(path));
    expect(md).toHaveLength(6);
    expect(site['/mcp-registry-auth']).toBeUndefined();
    expect(Object.keys(site).some((path) => /^\/(blog|docs)-md\//.test(path))).toBe(false);
  });

  it('posts the forms to the relative subscribers path, never the api host', () => {
    const chunks = Object.entries(site).filter(([path]) => path.endsWith('.js'));
    const js = chunks.map(([, body]) => String(body)).join('\n');
    expect(js).toContain('/api/v1/subscribers');
    expect(js).toContain('/api/v1/subscribers/unsubscribe?email=');
    expect(js).not.toMatch(/\/waitlist/);
  });
});

// The site's own file: a variable specifier keeps its DOM types out of this tsconfig.
const SESSION = '../../site/src/lib/session.ts';
type Session = { user: null; signInUrl: string } | null;
const { signedOutSession } = (await import(SESSION)) as {
  signedOutSession: (get: typeof fetch) => Promise<Session>;
};
const answering = (status: number, body: unknown) => async () =>
  new Response(JSON.stringify(body), { status });

describe('the account menu without a session route', () => {
  it('reads signed out and signs in at the discovery issuer', async () => {
    const get = answering(200, { issuer: 'https://auth.example.test' }) as typeof fetch;
    expect(await signedOutSession(get)).toEqual({
      user: null,
      signInUrl: 'https://auth.example.test/sign-in',
    });
  });

  it.each([
    ['the discovery is missing', 404, {}],
    ['it names no issuer', 200, {}],
  ])('keeps the slot empty when %s', async (_name, status, body) => {
    expect(await signedOutSession(answering(status, body) as typeof fetch)).toBeNull();
  });
});
