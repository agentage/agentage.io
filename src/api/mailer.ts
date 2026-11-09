import { readFileSync } from 'node:fs';
import { type PartContext } from '@agentage/extension';
import { unsubscribeUrls } from './unsubscribe-token.js';

const RESEND = 'https://api.resend.com/emails';
const SUBJECT = "You're on the AgentAge Memory waitlist";
const TIMEOUT_MS = 10_000;
// The web welcome mail as data, read once; npm run build copies both beside this file.
const [TEXT, HTML] = ['txt', 'html'].map((ext) =>
  readFileSync(new URL(`./welcome-mail.${ext}`, import.meta.url), 'utf8')
);
const FOOTER = (url: string) =>
  `<div style="font-size:11px;color:#B7BBC6;padding-top:8px;"><a href="${url}" style="color:#A6ABB8;text-decoration:underline;">Unsubscribe</a></div>`;

const fill = (template = '', site: string, unsubscribe: string) =>
  template.replaceAll('{{site}}', site).replace('{{unsubscribe}}', unsubscribe);

// The kit refuses an empty secret, so resend "off" is the no-mail value (I4).
const sendWelcome = async (ctx: PartContext, email: string): Promise<void> => {
  const { resend, unsubscribe } = ctx.secrets;
  if (!resend || resend === 'off') return ctx.log.warn('welcome mail skipped: no resend secret');
  const site = ctx.extension.origin;
  const links = unsubscribe ? unsubscribeUrls(site, email, unsubscribe) : undefined;
  const text = fill(TEXT, site, links ? `\n\nUnsubscribe (leave the waitlist): ${links.page}` : '');
  const html = fill(HTML, site, '').replace('{{footer}}', links ? FOOTER(links.page) : '');
  const headers = links && {
    'List-Unsubscribe': `<${links.oneClick}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
  const from = String(ctx.settings['mailFrom']);
  const body = { from, to: [email], subject: SUBJECT, text, html, ...(headers && { headers }) };
  const res = await fetch(RESEND, {
    method: 'POST',
    headers: { Authorization: `Bearer ${resend}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (res.ok) return;
  // Only the error name: Resend's message can repeat the recipient address.
  const { name } = (await res.json().catch(() => ({}))) as { name?: unknown };
  throw new Error(`resend send failed (${res.status}): ${String(name ?? 'unknown')}`);
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
