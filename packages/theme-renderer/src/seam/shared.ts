/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Seam replacements for the `shared/*` and `server/*` modules that
 * render-path files require directly, bypassing services/proxy.js
 * (extraction-map §2 "Bypasses"): shared/labs, shared/max-limit-cap,
 * shared/machine-payments, services/llms/markdown (getMarkdownUrl),
 * @tryghost/logging and @tryghost/debug.
 */
import { getRendererDeps } from './deps.ts';
import type { LabsPort, LoggingPort } from './types.ts';

// Replacement for shared/labs — delegates to the injected labs port.
export const labs: LabsPort = {
  isSet(flag: string) {
    return getRendererDeps().labs.isSet(flag);
  },
  getAll() {
    return getRendererDeps().labs.getAll();
  },
};

// Replacement for @tryghost/logging — delegates to the injected logging port
// (default binding is a console-free no-op set, see defaults.ts).
export const logging: LoggingPort = {
  info(...args: any[]) {
    getRendererDeps().logging.info(...args);
  },
  warn(...args: any[]) {
    getRendererDeps().logging.warn(...args);
  },
  error(...args: any[]) {
    getRendererDeps().logging.error(...args);
  },
};

// Replacement for @tryghost/debug — a no-op factory (debug output is a
// dev-tooling concern; the npm package is Node-flavoured).
export function debug(_name: string): (...args: any[]) => void {
  return function noop() {
    // intentionally empty
  };
}

// Copied from ghost/core/core/shared/max-limit-cap.js @ 407e032dc7 —
// transforms: CJS → ESM, `require('../shared/config')` → seam config port.
// The HTTP-specific exceptionEndpoints branch is retained (never hit in the
// package: no caller passes options.url).
const limitConfig = {
  get allowLimitAll() {
    return getRendererDeps().config.get('optimization:allowLimitAll') || false;
  },
  get maxLimit() {
    return getRendererDeps().config.get('optimization:maxLimit') || 100;
  },
  // Temporary exceptions to the max limit rule (HTTP-specific)
  exceptionEndpoints: [
    '/ghost/api/admin/posts/export/',
    '/ghost/api/admin/emails/', // /:id/batches/ and /:id/recipient-failures/
  ],
};

export function applyLimitCap(limit: any, options: { url?: string } = {}): any {
  if (!limit) {
    return limit;
  }

  // If 'all' is globally allowed, skip everything else
  if (limit === 'all' && limitConfig.allowLimitAll) {
    return limit;
  }

  // Check exception endpoints - they bypass all limits (HTTP-specific)
  if (
    options.url &&
    limitConfig.exceptionEndpoints.some((endpoint) => options.url!.startsWith(endpoint))
  ) {
    return limit;
  }

  // 'all' is no longer supported so gets capped to maxLimit
  if (limit === 'all') {
    return limitConfig.maxLimit;
  }

  // Convert to number for comparison
  const numericLimit = parseInt(String(limit), 10);

  // If it's not a valid number or exceeds maxLimit, cap it
  if (isNaN(numericLimit) || numericLimit > limitConfig.maxLimit) {
    return limitConfig.maxLimit;
  }

  // Return the original limit if it's within bounds
  return limit;
}

// Copied from ghost/core/core/shared/machine-payments.ts @ 407e032dc7 —
// transforms: none beyond ESM export placement.
type TierLike = {
  type?: string;
};

type PurchasableEntry = {
  visibility?: string;
  tiers?: TierLike[];
};

export function isPurchasableEntry(entry: PurchasableEntry | null | undefined): boolean {
  if (!entry) {
    return false;
  }

  if (entry.visibility === 'paid') {
    return true;
  }

  if (entry.visibility !== 'tiers') {
    return false;
  }

  return (
    Array.isArray(entry.tiers) &&
    entry.tiers.length > 0 &&
    entry.tiers.every((tier) => tier.type === 'paid')
  );
}

export function isMachinePaymentsEnabled({
  labs: labsService,
  settingsCache,
  isStripeConnected,
}: {
  labs: { isSet: (flag: string) => boolean };
  settingsCache: { get: (key: string) => unknown };
  isStripeConnected: () => boolean;
}): boolean {
  return (
    labsService.isSet('machinePayments') &&
    settingsCache.get('machine_payments_enabled') === true &&
    settingsCache.get('llms_enabled') !== false &&
    isStripeConnected()
  );
}

// Copied from ghost/core/core/frontend/services/llms/markdown.js @ 407e032dc7
// (getMarkdownPath/getMarkdownUrl only — the html→markdown conversion side is
// server-only). Transforms: CJS → ESM.
function getMarkdownPath(pathname: string): string {
  if (!pathname || pathname === '/') {
    return '/index.md';
  }

  const normalizedPath = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  return `${normalizedPath}.md`;
}

export function getMarkdownUrl(url: string): string {
  const parsedUrl = new URL(url);
  parsedUrl.pathname = getMarkdownPath(parsedUrl.pathname);
  return parsedUrl.toString();
}
