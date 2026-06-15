import {afterEach, describe, expect, it, vi} from 'vitest';

import {isSentryEventAllowed, setupSentry, type SentryEventLike, type SentrySdk} from './sentry';
import {reportError, setLogReporter, warn} from './log';
import type {SiteState} from '../types';

const ASSET_BASE = 'https://example.com/ghost/assets/portal';

function makeSite(overrides: Partial<SiteState> = {}): SiteState {
    return {
        title: 'Test Site',
        url: 'https://example.com',
        locale: 'en',
        sentry_dsn: 'https://abc123@o0.ingest.sentry.io/1',
        sentry_env: 'production',
        version: '6.0',
        ...overrides
    };
}

function makeSdk(): SentrySdk & {init: ReturnType<typeof vi.fn>; captureException: ReturnType<typeof vi.fn>} {
    return {init: vi.fn(), captureException: vi.fn()};
}

function makeEvent(...filenames: Array<string | undefined>): SentryEventLike {
    return {exception: {values: [{stacktrace: {frames: filenames.map(filename => ({filename}))}}]}};
}

describe('setupSentry', () => {
    afterEach(() => {
        setLogReporter(null);
        vi.restoreAllMocks();
    });

    it('never loads the SDK without a DSN', async () => {
        const loadSdk = vi.fn(async () => makeSdk());

        await setupSentry({site: makeSite({sentry_dsn: undefined})}, {loadSdk});

        expect(loadSdk).not.toHaveBeenCalled();
    });

    it('inits with dsn, environment, release tag and allowUrls', async () => {
        const sdk = makeSdk();

        await setupSentry({site: makeSite()}, {assetBase: ASSET_BASE, loadSdk: async () => sdk});

        const options = sdk.init.mock.calls[0]?.[0];
        expect(options.dsn).toBe('https://abc123@o0.ingest.sentry.io/1');
        expect(options.environment).toBe('production');
        expect(options.release).toMatch(/^superportal@.+\|ghost@6\.0$/);
        expect(options.allowUrls).toEqual([ASSET_BASE]);
    });

    it('defaults environment to development without sentry_env', async () => {
        const sdk = makeSdk();

        await setupSentry({site: makeSite({sentry_env: undefined})}, {loadSdk: async () => sdk});

        expect(sdk.init.mock.calls[0]?.[0].environment).toBe('development');
    });

    it('routes logged errors and reportError to captureException after init', async () => {
        const sdk = makeSdk();
        vi.spyOn(console, 'warn').mockImplementation(() => {});

        await setupSentry({site: makeSite()}, {loadSdk: async () => sdk});

        const flowError = new Error('signin failed');
        warn('failed to sign in', flowError);
        expect(sdk.captureException).toHaveBeenCalledWith(flowError, {level: 'warning', extra: {message: 'failed to sign in'}});

        const boundaryError = new Error('render blew up');
        reportError(boundaryError);
        expect(sdk.captureException).toHaveBeenCalledWith(boundaryError, {level: 'error', extra: {message: 'unhandled error'}});
    });

    it('survives a failing SDK load without throwing', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await setupSentry({site: makeSite()}, {loadSdk: () => Promise.reject(new Error('offline'))});

        expect(warnSpy).toHaveBeenCalled();
    });
});

describe('isSentryEventAllowed', () => {
    it('allows events whose last frame is under the asset base', () => {
        const event = makeEvent('https://theme.example.com/app.js', `${ASSET_BASE}/chunks/feature-members.js`);

        expect(isSentryEventAllowed(event, ASSET_BASE)).toBe(true);
    });

    it('rejects events whose last frame is foreign code', () => {
        const event = makeEvent(`${ASSET_BASE}/portal.min.js`, 'https://theme.example.com/app.js');

        expect(isSentryEventAllowed(event, ASSET_BASE)).toBe(false);
    });

    it('rejects events without stack frames', () => {
        expect(isSentryEventAllowed({}, ASSET_BASE)).toBe(false);
        expect(isSentryEventAllowed(makeEvent(undefined), ASSET_BASE)).toBe(false);
    });

    it('falls back to matching portal.min.js without an asset base', () => {
        const event = makeEvent('https://cdn.example.com/portal.min.js');

        expect(isSentryEventAllowed(event, '')).toBe(true);
    });
});
