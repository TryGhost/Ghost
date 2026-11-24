/**
 * Everything that would come from a server in the real feature. Nothing here
 * makes a request: results are decided locally after a short delay so the
 * spinners show.
 */

export function fakeDelay(ms = 700): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** The secret shown under the QR code. */
export const AUTHENTICATOR_KEY = 'JBSW Y3DP EHPK 3PXP';

/** The TXT record that proves a site owns an email domain. */
export const DOMAIN_VERIFICATION_RECORD = 'ghost-site-verification=7f3k9q2mxw4b';

/** The ten backup codes drawn on the canvas. */
export const BACKUP_CODES = [
  'h7k2-9fqm',
  'x4pn-3vtc',
  'r8dw-6jzb',
  'm2qs-7hxk',
  'c9vf-4ntr',
  'p3zb-8wmd',
  'k6tj-2qfx',
  'w5hc-9rpn',
  'b4mx-7dvs',
  'f8rq-3kzt',
];

const CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

/** A fresh set of ten backup codes, for "Get new codes". */
export function makeBackupCodes(): string[] {
  const part = () =>
    Array.from(
      { length: 4 },
      () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)],
    ).join('');
  return Array.from({ length: 10 }, () => `${part()}-${part()}`);
}

/** Any six digits pass except `000000`. */
export function isValidAppCode(code: string): boolean {
  return /^\d{6}$/.test(code) && code !== '000000';
}

function normalizeBackupCode(code: string): string {
  return code.trim().toLowerCase().replace(/[\s-]/g, '');
}

/** The remaining code that matches, compared case-insensitively with the dash optional. */
export function findBackupCode(input: string, remaining: string[]): string | undefined {
  const wanted = normalizeBackupCode(input);
  if (!wanted) {
    return undefined;
  }
  return remaining.find((code) => normalizeBackupCode(code) === wanted);
}

/** Wrong codes in a row before sign-in is paused. */
export const MAX_CODE_ATTEMPTS = 5;

/** The first pause. Each pause after it is twice as long. */
const FIRST_PAUSE_MS = 30_000;

export function pauseLength(pausesSoFar: number): number {
  return FIRST_PAUSE_MS * 2 ** pausesSoFar;
}

export function emailDomain(email: string): string {
  return email.split('@')[1]?.trim().toLowerCase() ?? '';
}

/** A stable pseudo-random pick, so the staff list looks mixed without changing on every render. */
export function stableHash(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index++) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}
