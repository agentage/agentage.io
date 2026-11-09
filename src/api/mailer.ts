import { type PartContext } from '@agentage/extension';
import { unsubscribeUrls } from './unsubscribe-token.js';
import { htmlBody, SUBJECT, textBody } from './welcome-mail.js';

const RESEND = 'https://api.resend.com/emails';

// The kit refuses an empty secret, so "off" is the no-mail value (I4) next to an empty one.
export const mailOn = (key: string | undefined): key is string => Boolean(key) && key !== 'off';

const payload = (ctx: PartContext, email: string, secret: string | undefined) => {
  const links = secret ? unsubscribeUrls(ctx.extension.origin, email, secret) : undefined;
  const headers = links && {
    'List-Unsubscribe': `<${links.oneClick}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
  const from = String(ctx.settings['mailFrom']);
  const site = ctx.extension.origin;
  const [text, html] = [textBody(site, links?.page), htmlBody(site, links?.page)];
  return { from, to: [email], subject: SUBJECT, text, html, ...(headers && { headers }) };
};

export const sendWelcome = async (ctx: PartContext, email: string): Promise<void> => {
  const { resend, unsubscribe } = ctx.secrets;
  if (!mailOn(resend)) return ctx.log.warn('welcome mail skipped: no resend secret');
  const res = await fetch(RESEND, {
    method: 'POST',
    headers: { Authorization: `Bearer ${resend}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload(ctx, email, unsubscribe)),
  });
  if (!res.ok) throw new Error(`resend send failed (${res.status})`);
};

// Fire-and-forget: a mail failure is logged and never fails or delays the signup.
export const welcome = (ctx: PartContext, email: string): void => {
  void sendWelcome(ctx, email).catch((err: unknown) => ctx.log.error(err));
};

declare module '@agentage/extension' {
  interface Secrets {
    resend?: string;
    unsubscribe?: string;
  }
}
