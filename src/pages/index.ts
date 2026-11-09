import { versionPage, type PagesContext } from '@agentage/extension';

export function create(ctx: PagesContext) {
  return { '/': versionPage(ctx) };
}
