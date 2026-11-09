import { siteFromDir, type PagesContext, type PagesSite } from '@agentage/extension';

const PROD_HOST = 'agentage.io';
const NOINDEX = '<meta name="robots" content="noindex"/>';

// Any host but the apex (next.agentage.io) is a copy: closed to crawlers, every page noindex.
const noindex = (site: PagesSite): PagesSite =>
  Object.fromEntries([
    ...Object.entries(site).map(([path, entry]) =>
      typeof entry === 'string' && entry.startsWith('<!DOCTYPE html>')
        ? [path, entry.replace('<head>', `<head>${NOINDEX}`)]
        : [path, entry]
    ),
    ['/robots.txt', 'User-agent: *\nDisallow: /\n'],
  ]);

// The static export of site/ (npm run build); the kit swaps the host token for this origin (C6).
export const create = (ctx: PagesContext) => {
  const site = siteFromDir('dist/pages/site', {
    origin: ctx.extension.origin,
    types: { '/opengraph-image': 'image/png', '/twitter-image': 'image/png' },
  });
  return new URL(ctx.extension.origin).host === PROD_HOST ? site : noindex(site);
};
