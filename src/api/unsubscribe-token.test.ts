import { describe, expect, it } from 'vitest';
import { signEmail, unsubscribeUrls, verifyEmail } from './unsubscribe-token.js';

const SECRET = 'unit-secret';

describe('the unsubscribe token', () => {
  it('verifies a token it signed', () => {
    expect(verifyEmail('a@example.com', signEmail('a@example.com', SECRET), SECRET)).toBe(true);
  });

  it('normalizes the email (trim + lowercase) on both sides', () => {
    expect(verifyEmail(' A@Example.com ', signEmail('a@example.com', SECRET), SECRET)).toBe(true);
  });

  it.each([
    ['a tampered token', (t: string) => `${t.slice(0, -1)}${t.endsWith('A') ? 'B' : 'A'}`],
    ['a token signed with another secret', () => signEmail('a@example.com', 'other')],
    ['garbage, without throwing', () => '!!'],
  ])('rejects %s', (_name, forge) => {
    expect(verifyEmail('a@example.com', forge(signEmail('a@example.com', SECRET)), SECRET)).toBe(
      false
    );
  });

  it('matches the web scheme: HMAC-SHA256, base64url', () => {
    expect(signEmail('a@example.com', SECRET)).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
});

describe('unsubscribeUrls', () => {
  const urls = unsubscribeUrls('https://next.example.test', 'b+x@example.com', SECRET);
  const token = signEmail('b+x@example.com', SECRET);

  it('puts the one-click POST on the root api', () => {
    expect(urls.oneClick).toBe(
      `https://next.example.test/api/v1/subscribers/unsubscribe?email=b%2Bx%40example.com&token=${token}`
    );
  });

  it('keeps the human page on the site', () => {
    expect(urls.page).toBe(
      `https://next.example.test/unsubscribe?email=b%2Bx%40example.com&token=${token}`
    );
  });
});
