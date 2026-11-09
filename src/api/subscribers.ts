import { fail, pageOf, PageQuerySchema, reply, type ApiContext } from '@agentage/extension';
import { z } from 'zod';
import { welcome } from './mailer.js';
import { createRateLimit } from './rate-limit.js';
import {
  EmailSchema,
  JoinSchema,
  SubscriberSchema,
  UnsubscribeQuerySchema,
} from './subscriber.schema.js';
import {
  hasSubscriber,
  joinSubscriber,
  listSubscribers,
  removeSubscriber,
} from './subscribers.store.js';
import { verifyEmail } from './unsubscribe-token.js';

type Limit = ReturnType<typeof createRateLimit>;
const { cursor } = PageQuerySchema.shape;
const ListSchema = PageQuerySchema.extend({ cursor: cursor.unwrap().pipe(z.uuid()).optional() });
const BAD_EMAIL = { details: [{ field: 'email', message: 'Invalid email address' }] };
const BAD_LINK = { code: 'INVALID_UNSUBSCRIBE_LINK' };
const GONE_CURSOR = {
  details: [{ field: 'cursor', message: 'The row is gone, list from the start' }],
};

const joinRoute = (ctx: ApiContext, limit: Limit) => {
  const spec = { summary: 'Subscribe an address', scope: 'public', input: JoinSchema } as const;
  const full = { ...spec, output: SubscriberSchema, status: 201 } as const;
  ctx.route('post', '/subscribers', full, async ({ input, ip, header }) => {
    limit(ip);
    const email = EmailSchema.safeParse(input.email);
    if (!email.success) throw fail('VALIDATION_ERROR', 'Invalid body', BAD_EMAIL);
    const join = { ...input, email: email.data, referrer: input.referrer ?? header('referer') };
    const { subscriber, created } = await joinSubscriber(ctx.store, join, ip, header('user-agent'));
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
      throw fail('VALIDATION_ERROR', 'Invalid unsubscribe link', BAD_LINK);
    await removeSubscriber(ctx.store, query.email);
    return {};
  });
};

const listRoute = (ctx: ApiContext) => {
  const spec = { summary: 'List subscribers, newest first', scope: 'admin' } as const;
  const full = { ...spec, input: ListSchema, output: z.array(SubscriberSchema) };
  ctx.route('get', '/subscribers', full, async ({ input: { cursor, limit } }) => {
    const rows = await listSubscribers(ctx.store, cursor ?? null, limit);
    // An unsubscribed cursor row would read as the last page; refused so no export stops short.
    if (cursor && !rows.length && !(await hasSubscriber(ctx.store, cursor)))
      throw fail('VALIDATION_ERROR', 'Invalid query', GONE_CURSOR);
    return pageOf(rows, limit);
  });
};

// C8: anonymous join and unsubscribe (one per-ip limit, counted first, as web), the list for root:admin.
export const subscriberRoutes = (ctx: ApiContext) => {
  const limit = createRateLimit();
  joinRoute(ctx, limit);
  unsubscribeRoute(ctx, limit);
  listRoute(ctx);
};
