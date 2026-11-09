import { type ApiContext } from '@agentage/extension';
import { subscriberRoutes } from './subscribers.js';
import { wellKnownDocuments } from './well-known.js';

// Mounted at /api/v1; the apex holds no account route (those live on platform).
export const create = (ctx: ApiContext) => {
  subscriberRoutes(ctx);
  wellKnownDocuments(ctx);
};
