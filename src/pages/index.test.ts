import { readdirSync, readFileSync } from 'node:fs';
import { createTestContext } from '@agentage/extension';
import { describe, expect, it } from 'vitest';
import { create } from './index.js';

const siteOn = (origin: string) =>
  create({ ...createTestContext(), extension: { ...createTestContext().extension, origin } });
const ORIGIN = 'https://next.example.test';
const site = siteOn(ORIGIN);
const prod = siteOn('https://agentage.io');
const text = (path: string, from = site) => {
  const entry = from[path];
  expect(typeof entry).toBe('string');
  return entry as string;
};
const files = readdirSync('dist/pages/site', { recursive: true, withFileTypes: true });
const exported = (file: string) =>
  readFileSync(`dist/pages/site/${file}`, 'utf8').replace(
    /site-fqdn\.sentinel\.invalid/gi,
    'agentage.io'
  );
const pages = (from: typeof site) =>
  Object.values(from).filter(
    (e): e is string => typeof e === 'string' && e.startsWith('<!DOCTYPE')
  );

describe('the pages site', () => {
  it('maps every exported file to one path', () => {
    expect(Object.keys(site)).toHaveLength(files.filter((e) => e.isFile()).length);
    expect(Object.keys(site)).toEqual(expect.arrayContaining(['/', '/blog', '/unsubscribe']));
  });

  it('serves the sitemap and the canonical on the origin', () => {
    expect(text('/sitemap.xml')).toContain(`<loc>${ORIGIN}/blog</loc>`);
    expect(text('/')).toContain(`<link rel="canonical" href="${ORIGIN}"`);
  });

  it('closes a host other than agentage.io to crawlers: robots Disallow, every page noindex', () => {
    expect(text('/robots.txt')).toBe('User-agent: *\nDisallow: /\n');
    expect(pages(site).length).toBeGreaterThan(10);
    expect(
      pages(site).every((html) => html.includes('<meta name="robots" content="noindex"/>'))
    ).toBe(true);
  });

  it('keeps robots, the sitemap and the pages of agentage.io byte for byte', () => {
    expect(text('/robots.txt', prod)).toBe(exported('robots.txt'));
    expect(text('/sitemap.xml', prod)).toBe(exported('sitemap.xml'));
    expect(text('/', prod)).toBe(exported('index.html'));
    expect(
      pages(prod).some((html) => html.includes('<head><meta name="robots" content="noindex"/>'))
    ).toBe(false);
  });

  it('drops the docs: they stay on landing (F15)', () => {
    expect(Object.keys(site).filter((path) => /^\/docs/.test(path))).toEqual([]);
    expect(pages(site).filter((html) => html.includes('href="/docs'))).toEqual([]);
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
type Session = { user: null; signInUrl: string };
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
    ['the discovery is missing', answering(404, {})],
    ['it names no issuer', answering(200, {})],
    ['the fetch fails', async () => Promise.reject(new Error('offline'))],
  ])('still reads signed out when %s', async (_name, get) => {
    expect(await signedOutSession(get as typeof fetch)).toEqual({
      user: null,
      signInUrl: 'https://auth.agentage.io/sign-in',
    });
  });
});
