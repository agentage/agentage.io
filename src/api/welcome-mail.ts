// The web welcome mail (waitlist-mailer.service.ts), copy and layout unchanged; links on the root origin.
const SANS = "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";

export const SUBJECT = "You're on the AgentAge Memory waitlist";

export const textBody = (site: string, unsubscribe?: string): string =>
  [
    "You're in.",
    '',
    "AgentAge Memory is one memory you own - plain markdown that's yours to export anytime.",
    'Claude, Cursor, and ChatGPT all read and write it over MCP, so every AI shares the same',
    'memory. Open and portable - never locked to one vendor.',
    '',
    "You'll only hear from us about your spot and major launch news - nothing else.",
    '',
    `See what we're building: ${site}`,
    '',
    'One memory. Every AI. Owned by you.',
    'AgentAge - agentage.io',
    ...(unsubscribe ? ['', `Unsubscribe (leave the waitlist): ${unsubscribe}`] : []),
  ].join('\n');

const footer = (unsubscribe?: string): string =>
  unsubscribe
    ? `<div style="font-size:11px;color:#B7BBC6;padding-top:8px;"><a href="${unsubscribe}" style="color:#A6ABB8;text-decoration:underline;">Unsubscribe</a></div>`
    : '';

const paragraph = (top: number, html: string) =>
  `<tr><td style="padding:${top}px 40px 0 40px;font-family:'Inter',sans-serif;"><div style="font-size:15px;line-height:1.6;color:#4A5163;">${html}</div></td></tr>`;

export const htmlBody = (site: string, unsubscribe?: string): string =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F6F7FB;">
<tr><td align="center" style="padding:48px 20px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;">
  <tr><td align="center" style="padding:0 0 28px 0;font-family:${SANS};">
    <span style="font-size:18px;font-weight:700;letter-spacing:-0.01em;color:#16181F;">Agent<span style="color:#F59E0B;font-variant-emoji:text;">&#9829;&#65038;</span>Age</span>
    <span style="display:inline-block;margin-left:6px;padding:2px 7px;border-radius:5px;background-color:#FDF1DC;color:#B5740A;font-size:11px;font-weight:600;vertical-align:middle;">Memory</span>
  </td></tr>
  <tr><td style="background-color:#FFFFFF;border:1px solid #E6E8EE;border-radius:14px;box-shadow:0px 4px 14px rgba(17,24,39,0.05);">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:40px 40px 8px 40px;font-family:${SANS};">
        <div style="font-size:22px;font-weight:600;line-height:1.35;color:#16181F;">You&rsquo;re in.</div>
      </td></tr>
      ${paragraph(12, 'AgentAge Memory is one memory you own - plain markdown that&rsquo;s yours to export anytime. Claude, Cursor, and ChatGPT all read and write it over MCP, so every AI shares the same memory. Open and portable - never locked to one vendor.')}
      ${paragraph(18, 'You&rsquo;ll only hear from us about your spot and major launch news - nothing else.')}
      <tr><td style="padding:28px 40px 40px 40px;">
        <a href="${site}" style="display:inline-block;background-color:#F59E0B;color:#1A1206;font-family:'Inter',sans-serif;font-size:15px;font-weight:600;text-decoration:none;padding:13px 28px;border-radius:9px;">See what we&rsquo;re building</a>
      </td></tr>
    </table>
  </td></tr>
  <tr><td align="center" style="padding:28px 20px 0 20px;font-family:'Inter',sans-serif;">
    <div style="font-size:13px;font-weight:500;color:#70778C;">One memory. Every AI. Owned by you.</div>
    <div style="font-size:12px;color:#A6ABB8;padding-top:6px;">AgentAge &middot; <a href="${site}" style="color:#A6ABB8;text-decoration:underline;">agentage.io</a></div>
    ${footer(unsubscribe)}
  </td></tr>
</table>
</td></tr>
</table>`;
