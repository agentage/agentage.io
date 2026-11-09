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

// Docs live on docs.<host> (F15); the apex answers its old /docs paths with a 308 there, as prod.
const docs = (origin: string): PagesSite => {
  const { protocol, host } = new URL(origin);
  const to = { redirect: `${protocol}//docs.${host}/` };
  return { '/docs': to, '/docs/*': to };
};

// The static export of site/ (npm run build); the kit swaps the host token for this origin (C6).
export const create = (ctx: PagesContext) => {
  const site = {
    ...siteFromDir('dist/pages/site', {
      origin: ctx.extension.origin,
      types: { '/opengraph-image': 'image/png', '/twitter-image': 'image/png' },
    }),
    ...docs(ctx.extension.origin),
  };
  return new URL(ctx.extension.origin).host === PROD_HOST ? site : noindex(site);
};
