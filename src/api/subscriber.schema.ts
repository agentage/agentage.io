import { z } from 'zod';

// A bad context field is dropped, not refused: the route counts the call before it checks the email.
const text = (max: number) => z.string().trim().max(max).optional().catch(undefined);
// Lower-cased and trimmed before the check, so padded or mixed-case input is accepted.
export const EmailSchema = z.string().trim().toLowerCase().pipe(z.email());

const UtmSchema = z.object({
  source: text(255),
  medium: text(255),
  campaign: text(255),
  term: text(255),
  content: text(255),
});

// The live form's body; unknown keys (list, tools) are dropped, ip and user agent never trusted from it.
export const JoinSchema = z.object({
  email: z.string().max(320).catch(''),
  referrer: text(2048),
  utm: UtmSchema.optional().catch(undefined),
  locale: text(35),
  timezone: text(64),
  page: text(2048),
});

export type Join = Omit<z.output<typeof JoinSchema>, 'email'> & { email: string };

export const SubscriberSchema = z.object({
  id: z.string(),
  email: z.string(),
  createdAt: z.string(),
});

export type Subscriber = z.output<typeof SubscriberSchema>;

// Anything missing, malformed or oversized reads as empty: INVALID_UNSUBSCRIBE_LINK, as in web.
export const UnsubscribeQuerySchema = z.object({
  email: z.string().trim().toLowerCase().max(320).catch(''),
  token: z.string().max(128).catch(''),
});
