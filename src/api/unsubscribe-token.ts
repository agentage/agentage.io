import { createHmac, timingSafeEqual } from 'node:crypto';

// Stateless: HMAC-SHA256 over the normalized email, the web scheme, so links already mailed keep working.
export const signEmail = (email: string, secret: string): string =>
  createHmac('sha256', secret).update(email.trim().toLowerCase()).digest('base64url');

export const verifyEmail = (email: string, token: string, secret: string): boolean => {
  const expected = Buffer.from(signEmail(email, secret));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
};

// Both on the root origin: the page is the site's /unsubscribe, the one-click POST its api.
export const unsubscribeUrls = (origin: string, email: string, secret: string) => {
  const [e, t] = [encodeURIComponent(email), signEmail(email, secret)];
  return {
    page: `${origin}/unsubscribe?email=${e}&token=${t}`,
    oneClick: `${origin}/api/v1/subscribers/unsubscribe?email=${e}&token=${t}`,
  };
};
