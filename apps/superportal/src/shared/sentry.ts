import {setLogReporter, warn} from './log';
import type {SiteState} from '../types';

/** Minimal structural slice of @sentry/browser so tests can stub the loader. */
export interface SentrySdk {
    init(options: Record<string, unknown>): void;
    captureException(e: unknown, ctx?: {level?: 'warning' | 'error'; extra?: Record<string, unknown>}): unknown;
}

export interface SentryEventLike {
    exception?: {values?: Array<{stacktrace?: {frames?: Array<{filename?: string}>}}>};
}

interface SetupOptions {
    /** URL prefix the bundle + chunks are served from (shell's detectAssetBase). */
    assetBase?: string;
    loadSdk?: () => Promise<SentrySdk>;
}

/**
 * Error reporting via Sentry. Inits only when the site has a `sentry_dsn`
 * (server `client_sentry` config exposed on /members/api/site — set on
 * Ghost(Pro), absent on most self-hosted installs). The SDK is imported
 * lazily so DSN-less sites never download it. Once initialised, errors
 * routed through shared/log (warn/error with an Error arg, reportError)
 * are captured.
 *
 * Mirrors apps/portal/src/app.js#setupSentry.
 */
export async function setupSentry(
    {site}: {site: SiteState},
    {assetBase = '', loadSdk = loadSentryBrowser}: SetupOptions = {}
): Promise<void> {
    const dsn = site.sentry_dsn;
    if (!dsn) return;
    try {
        const sdk = await loadSdk();
        const version = typeof SUPERPORTAL_VERSION !== 'undefined' ? SUPERPORTAL_VERSION : '0.0.0-dev';
        sdk.init({
            dsn,
            environment: site.sentry_env || 'development',
            release: `superportal@${version}|ghost@${site.version ?? 'unknown'}`,
            beforeSend: (event: SentryEventLike) => (isSentryEventAllowed(event, assetBase) ? event : null),
            allowUrls: assetBase ? [assetBase] : []
        });
        setLogReporter((level, message, err) => {
            sdk.captureException(err instanceof Error ? err : new Error(message), {level, extra: {message}});
        });
    } catch (err) {
        warn('sentry setup failed', err);
    }
}

/**
 * Only report events originating from our own bundle (last stack frame under
 * the asset base), never from theme or third-party scripts.
 *
 * Mirrors apps/portal/src/utils/helpers.js#isSentryEventAllowed.
 */
export function isSentryEventAllowed(event: SentryEventLike, assetBase: string): boolean {
    const frames = event?.exception?.values?.[0]?.stacktrace?.frames ?? [];
    const fileNames = frames
        .map(frame => frame.filename)
        .filter((filename): filename is string => Boolean(filename));
    const lastFileName = fileNames[fileNames.length - 1] ?? '';
    if (!lastFileName) return false;
    return (assetBase !== '' && lastFileName.startsWith(assetBase)) || lastFileName.includes('/portal.min.js');
}

function loadSentryBrowser(): Promise<SentrySdk> {
    return import('@sentry/browser');
}
