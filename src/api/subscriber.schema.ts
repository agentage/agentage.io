import { z } from 'zod';

const text = (max: number) => z.string().trim().max(max);
// Lower-cased and trimmed before the check, so padded or mixed-case input is accepted.
export const EmailSchema = z.string().trim().toLowerCase().pipe(z.email());

// The live form's body; unknown keys (its list field) are dropped, ip and user agent never trusted from it.
export const JoinSchema = z.object({
  email: EmailSchema,
  tools: z.array(text(64).min(1)).max(20).optional(),
  referrer: text(2048).optional(),
  utm: z
    .object({
      source: text(255).optional(),
      medium: text(255).optional(),
      campaign: text(255).optional(),
      term: text(255).optional(),
      content: text(255).optional(),
    })
    .optional(),
  locale: text(35).optional(),
  timezone: text(64).optional(),
  page: text(2048).optional(),
});

export type Join = z.output<typeof JoinSchema>;

export const SubscriberSchema = z.object({
  id: z.string(),
  email: z.string(),
  createdAt: z.string(),
});

export type Subscriber = z.output<typeof SubscriberSchema>;

export const UnsubscribeParamsSchema = z.object({
  email: z.string().trim().toLowerCase().max(320),
  token: z.string().max(128),
});
