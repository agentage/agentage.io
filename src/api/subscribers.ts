import { fail, pageOf, PageQuerySchema, type ApiContext } from '@agentage/extension';
import { z } from 'zod';
import { welcome } from './mailer.js';
import { JoinSchema, SubscriberSchema, UnsubscribeParamsSchema } from './subscriber.schema.js';
import { joinSubscriber, listSubscribers, removeSubscriber } from './subscribers.store.js';
import { verifyEmail } from './unsubscribe-token.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const Done = z.object({});
const INVALID_LINK = [{ field: 'token', message: 'INVALID_UNSUBSCRIBE_LINK' }];

// The kit hands a route no request, so ip and user agent stay null until it does.
const NO_CLIENT = { ip: null, userAgent: null };

const joinRoute = (ctx: ApiContext) => {
  const spec = { summary: 'Subscribe an address', scope: 'public', input: JoinSchema } as const;
  ctx.route('post', '/subscribers', { ...spec, output: SubscriberSchema }, async ({ input }) => {
    const { subscriber, created } = await joinSubscriber(ctx.store, input, NO_CLIENT);
    if (created) welcome(ctx, subscriber.email);
    return subscriber;
  });
};

const unsubscribeRoute = (ctx: ApiContext) => {
  const spec = { summary: 'Unsubscribe by a signed link', scope: 'public' } as const;
  const path = '/subscribers/unsubscribe/{email}/{token}';
  const full = { ...spec, params: UnsubscribeParamsSchema, output: Done };
  ctx.route('post', path, full, async ({ params: { email, token } }) => {
    const secret = ctx.secrets.unsubscribe;
    if (!secret || !verifyEmail(email, token, secret))
      throw fail('VALIDATION_ERROR', 'Invalid unsubscribe link', { details: INVALID_LINK });
    await removeSubscriber(ctx.store, email);
    return {};
  });
};

const listRoute = (ctx: ApiContext) => {
  const spec = { summary: 'List subscribers, newest first', scope: 'admin' } as const;
  const output = z.array(SubscriberSchema);
  ctx.route(
    'get',
    '/subscribers',
    { ...spec, input: PageQuerySchema, output },
    async ({ input }) => {
      const cursor = input.cursor ?? null;
      if (cursor && !UUID.test(cursor)) throw fail('VALIDATION_ERROR', 'Invalid cursor');
      return pageOf(await listSubscribers(ctx.store, cursor, input.limit), input.limit);
    }
  );
};

// C8: anonymous join and unsubscribe, the list for root:admin; port of web routes/waitlist.ts.
export const subscriberRoutes = (ctx: ApiContext) => {
  joinRoute(ctx);
  unsubscribeRoute(ctx);
  listRoute(ctx);
};
