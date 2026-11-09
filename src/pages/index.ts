import { siteFromDir, type PagesContext } from '@agentage/extension';

// The static export of site/ (npm run build); the kit swaps the host token for this origin (C6).
export const create = (ctx: PagesContext) =>
  siteFromDir('dist/pages/site', {
    origin: ctx.extension.origin,
    types: { '/opengraph-image': 'image/png', '/twitter-image': 'image/png' },
  });
