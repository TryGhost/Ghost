/**
 * # Theme preview tokens
 *
 * Previewing an installed theme that isn't active (Ghost Admin's Design
 * settings) needs a token: the Admin API gives one to staff who may activate
 * themes, and the frontend renders an inactive theme only for a request that
 * carries a valid one. A token names one theme and expires; it is signed with
 * the site's session secret, as the admin toolbar's are, under its own prefix
 * so one kind can't stand in for the other. It is URL safe: preview assets
 * carry it in their path.
 */
import crypto from 'crypto';
import { timingSafeStringEqual } from './timing-safe-string-equal';

const settingsCache = require('./settings-cache');

export const TTL_MS = 60 * 60 * 1000;
// A page token renders pages; an asset token, made from it for the preview's
// asset URLs, only fetches the theme's files. Asset URLs end up in CDN caches and
// logs, so one found there can't be used to render anything.
const PAGE_PURPOSE = 'theme-preview';
const ASSET_PURPOSE = 'theme-preview-assets';

type Purpose = typeof PAGE_PURPOSE | typeof ASSET_PURPOSE;

function getSecret(): string | undefined {
  return settingsCache.get('admin_session_secret') || settingsCache.get('theme_session_secret');
}

function sign(payload: string, secret: string, purpose: Purpose = PAGE_PURPOSE): string {
  return crypto.createHmac('sha256', secret).update(`${purpose}:${payload}`).digest('base64url');
}

/**
 * @returns the token and when it expires, or null without a secret to sign with
 */
export function create(
  themeName: string,
  now = Date.now(),
): { token: string; expiresAt: number } | null {
  const secret = getSecret();
  if (!secret) {
    return null;
  }

  const expiresAt = now + TTL_MS;
  const payload = Buffer.from(JSON.stringify({ t: themeName, e: expiresAt })).toString('base64url');

  return { token: `${payload}.${sign(payload, secret)}`, expiresAt };
}

/**
 * The asset token for a page token: the same theme and expiry, signed for assets
 *
 * @param pageToken - a valid page token
 */
export function assetTokenFor(pageToken: unknown): string | null {
  const secret = getSecret();
  const [payload] = typeof pageToken === 'string' ? pageToken.split('.') : [];
  if (!secret || !payload) {
    return null;
  }
  return `${payload}.${sign(payload, secret, ASSET_PURPOSE)}`;
}

/** What a token's payload holds, once its signature has been checked */
function readPayload(payload: string): { themeName: string; expiresAt: number } | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }
    const { t: themeName, e: expiresAt } = parsed as Record<string, unknown>;
    if (typeof themeName !== 'string' || typeof expiresAt !== 'number') {
      return null;
    }
    return { themeName, expiresAt };
  } catch {
    return null;
  }
}

/**
 * @returns the theme the token previews, or null when it isn't valid for that purpose
 */
function verifyFor(token: unknown, now: number, purpose: Purpose): string | null {
  const secret = getSecret();
  if (!secret || typeof token !== 'string' || token.length > 2048) {
    return null;
  }

  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra !== undefined) {
    return null;
  }

  if (!timingSafeStringEqual(sign(payload, secret, purpose), signature)) {
    return null;
  }

  const read = readPayload(payload);
  if (!read || !Number.isFinite(read.expiresAt) || read.expiresAt <= now) {
    return null;
  }
  return read.themeName;
}

/**
 * @param token - a page token
 * @returns the theme it previews, or null when it isn't a valid page token
 */
export function verify(token: unknown, now = Date.now()): string | null {
  return verifyFor(token, now, PAGE_PURPOSE);
}

/**
 * @param token - an asset token
 * @returns the theme whose files it fetches, or null when it isn't a valid asset token
 */
export function verifyAsset(token: unknown, now = Date.now()): string | null {
  return verifyFor(token, now, ASSET_PURPOSE);
}

const ASSET_PATH_TOKEN = /(\/assets\/_preview\/)[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
const HEADER_TOKEN = /(theme_token=)[^&]*/g;

/**
 * A URL or preview header with any preview token in it replaced, for logs and
 * error reports
 */
export function redact<T>(value: T): T | string {
  if (typeof value !== 'string') {
    return value;
  }
  return value.replace(ASSET_PATH_TOKEN, '$1[redacted]').replace(HEADER_TOKEN, '$1[redacted]');
}
