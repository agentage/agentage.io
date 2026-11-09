import { fail, pageOf, PageQuerySchema, reply, type ApiContext } from '@agentage/extension';
import { z } from 'zod';
import { welcome } from './mailer.js';
import { createRateLimit } from './rate-limit.js';
import { JoinSchema, SubscriberSchema, UnsubscribeQuerySchema } from './subscriber.schema.js';
import { joinSubscriber, listSubscribers, removeSubscriber } from './subscribers.store.js';
import { verifyEmail } from './unsubscribe-token.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
type Limit = ReturnType<typeof createRateLimit>;

const joinRoute = (ctx: ApiContext, limit: Limit) => {
  const spec = { summary: 'Subscribe an address', scope: 'public', input: JoinSchema } as const;
  const full = { ...spec, output: SubscriberSchema, status: 201 } as const;
  ctx.route('post', '/subscribers', full, async ({ input, ip, header }) => {
    limit(ip);
    const join = { ...input, referrer: input.referrer ?? header('referer') };
    const client = { ip, userAgent: header('user-agent') ?? null };
    const { subscriber, created } = await joinSubscriber(ctx.store, join, client);
    if (created) welcome(ctx, subscriber.email);
    return reply(subscriber, { status: created ? 201 : 200 });
  });
};

const unsubscribeRoute = (ctx: ApiContext, limit: Limit) => {
  const spec = { summary: 'Unsubscribe by a signed link', scope: 'public' } as const;
  const full = { ...spec, query: UnsubscribeQuerySchema, output: z.object({}) };
  ctx.route('post', '/subscribers/unsubscribe', full, async ({ query, ip }) => {
    limit(ip);
    const secret = ctx.secrets.unsubscribe;
    if (!secret || !query.email || !verifyEmail(query.email, query.token, secret))
      throw fail('VALIDATION_ERROR', 'Invalid unsubscribe link', {
        code: 'INVALID_UNSUBSCRIBE_LINK',
      });
    await removeSubscriber(ctx.store, query.email);
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

// C8: anonymous join and unsubscribe (one per-ip limit, as web), the list for root:admin.
export const subscriberRoutes = (ctx: ApiContext) => {
  const limit = createRateLimit();
  joinRoute(ctx, limit);
  unsubscribeRoute(ctx, limit);
  listRoute(ctx);
};
