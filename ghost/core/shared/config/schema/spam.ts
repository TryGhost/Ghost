import { z } from 'zod';
import { knownKeys } from './primitives';

/**
 * One limiter's settings. defaults.json sets every key on every block, except
 * `lifetime` on `user_login`, where the limiter fills in its own.
 *
 * Strips unknown keys, as express-brute was only ever handed these four.
 */
export const spamLimiter = z.object({
  freeRetries: z
    .int()
    .min(0)
    .meta({
      description: 'Requests allowed before the limiter starts blocking.',
      examples: [4, 99],
    }),
  minWait: z
    .int()
    .min(0)
    .meta({
      description:
        'First wait in milliseconds. Later waits follow a Fibonacci run from it, up to maxWait.',
      examples: [600000, 3600000],
    }),
  maxWait: z
    .int()
    .min(0)
    .meta({
      description: 'Longest block in milliseconds.',
      examples: [3600000, 604800000],
    }),
  lifetime: z
    .int()
    .min(0)
    .optional()
    .meta({
      description:
        "Seconds a key's count lasts from its first request. Defaults to the sum of every wait from minWait up to maxWait.",
      examples: [3600, 43200],
    }),
});

export type SpamLimiter = z.infer<typeof spamLimiter>;

function limiter(description: string) {
  return spamLimiter.meta({ description });
}

/**
 * Rate limits for auth, signup and other abusable endpoints. defaults.json
 * supplies every block, so each is present.
 *
 * Closed: spam-prevention and settings-helpers read only the keys named here.
 * An unknown block is reported, then stripped. A typo inside a block is only
 * stripped.
 */
export const spam = knownKeys('spam', {
  user_login: limiter(
    'Staff sign-in attempts per IP, and member sign-in requests per email and IP.',
  ),
  user_reset: limiter('Staff password reset requests per email and IP.'),
  send_verification_code_user: limiter(
    'Staff verification emails per user, across IPs and sessions.',
  ),
  user_verification: limiter('Staff email verification code attempts per IP.'),
  user_verification_challenge: limiter(
    'Staff email verification code attempts per challenge, across IPs.',
  ),
  send_verification_code: limiter('Staff email verification code resends per IP.'),
  global_reset: limiter('Staff password reset requests per IP, across all emails.'),
  global_block: limiter('Staff sign-in and session requests per IP, across all users.'),
  private_block: limiter('Password attempts on a private site, per IP.'),
  content_api_key: limiter(
    'Content API requests with an unknown key, per IP. Kept in memory, not the database.',
  ),
  member_login: limiter('Member sign-in and signup requests per IP, across all emails.'),
  checkout_session_global: limiter('Stripe checkout sessions per IP.'),
  checkout_session_email: limiter('Stripe checkout sessions per email.'),
  webmentions_block: limiter('Incoming webmentions per IP.'),
  upgrade_api_block: limiter('Requests to the upgrade routes per IP.'),
  upgrade_block: limiter('Upgrade requests per staff user.'),
  staff_invite_block: limiter('Staff invitations sent, across the whole site.'),
  email_preview_block: limiter('Test newsletter sends, across the whole site.'),
  otc_verification_enumeration: limiter('Member sign-in code attempts per IP, across all codes.'),
  otc_verification: limiter('Member sign-in code attempts per code.'),
  blocked_email_domains: z.array(z.string()).meta({
    description: 'Email domains members cannot sign up with, added to the ones set in Admin.',
    examples: [['spam.xyz', 'junk.com']],
  }),
}).meta({
  description: 'Rate limits for sign-in, signup and other abusable endpoints.',
});

export type Spam = z.infer<typeof spam>;

export type SpamBlock = Exclude<keyof Spam, 'blocked_email_domains'>;
