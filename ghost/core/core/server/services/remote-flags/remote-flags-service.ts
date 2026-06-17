import logging from '@tryghost/logging';
import {resolve} from './resolve';

const DEFAULT_POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_JITTER_MS = 60 * 1000; // up to 1 minute of spread per poll
const REQUEST_TIMEOUT_MS = 10 * 1000;

type FlagOverrides = Record<string, boolean>;

interface RequestResponse {
    statusCode?: number;
    body?: string;
    headers?: Record<string, string | undefined>;
}

// @tryghost/request validates with validator.isURL, which only accepts strings and
// rejects a URL object outright, so the client is always called with a string.
type RequestFn = (url: string, options: Record<string, unknown>) => Promise<RequestResponse>;

export interface RemoteFlagsServiceDeps {
    /** canonical manifest URL (one per environment) */
    url: URL;
    /** this site's UUID (the ramp bucket key); undefined disables ramps but not full overrides */
    siteUuid?: string;
    /** sink for resolved overrides (the shared override store's replace()) */
    applyOverrides: (overrides: FlagOverrides) => void;
    /** @tryghost/request-compatible client */
    request: RequestFn;
    /** base poll interval in ms */
    pollInterval?: number;
    /** max random extra delay per poll in ms */
    jitter?: number;
    /** returns 0..1 (injectable for tests) */
    getRandom?: () => number;
}

/**
 * Polls the manifest, resolves it for this site, and writes the result to the
 * shared override store. Fail-open by design: a missing/broken/unreachable manifest
 * keeps last-known-good (or clears) and never throws, so it can't take a site down.
 * The HTTP client and override sink are injected for testing.
 */
export class RemoteFlagsService {
    url: URL;
    siteUuid?: string;
    applyOverrides: (overrides: FlagOverrides) => void;
    request: RequestFn;
    pollInterval: number;
    jitter: number;
    getRandom: () => number;

    _etag: string | null;
    _resolvedKey: string | null;
    _timer: ReturnType<typeof setTimeout> | null;
    _started: boolean;
    _refreshing: boolean;

    constructor(deps: RemoteFlagsServiceDeps) {
        this.url = deps.url;
        this.siteUuid = deps.siteUuid;
        this.applyOverrides = deps.applyOverrides;
        this.request = deps.request;
        this.pollInterval = deps.pollInterval || DEFAULT_POLL_INTERVAL_MS;
        this.jitter = deps.jitter === undefined ? DEFAULT_JITTER_MS : deps.jitter;
        this.getRandom = deps.getRandom || Math.random;

        this._etag = null; // last seen ETag, for conditional GETs
        this._resolvedKey = null; // serialized last-applied resolved map, for change detection
        this._timer = null;
        this._started = false;
        this._refreshing = false;
    }

    /**
     * Fetch, resolve, and apply the manifest once. Never rejects. Overlapping calls
     * are coalesced so concurrent refreshes can't race the cached ETag.
     */
    async refresh(): Promise<void> {
        if (this._refreshing) {
            return;
        }
        this._refreshing = true;
        try {
            await this._doRefresh();
        } finally {
            this._refreshing = false;
        }
    }

    /** @private */
    async _doRefresh(): Promise<void> {
        let response: RequestResponse;
        try {
            const headers: Record<string, string> = {};
            if (this._etag) {
                headers['if-none-match'] = this._etag;
            }
            // Pass the string form: @tryghost/request rejects a URL object.
            response = await this.request(this.url.href, {
                method: 'GET',
                headers,
                throwHttpErrors: false,
                responseType: 'text',
                followRedirect: false,
                retry: {limit: 0},
                timeout: {request: REQUEST_TIMEOUT_MS}
            });
        } catch (err) {
            // Network/timeout error: keep last-known-good, change nothing.
            logging.warn({
                system: {event: 'remote_flags.fetch_failed'},
                err
            }, 'Remote feature flags fetch failed; keeping last-known-good');
            return;
        }

        try {
            const status = response && response.statusCode;

            if (status === 304) {
                // Not modified: current overrides are still correct.
                return;
            }

            if (status === 404) {
                // No manifest published: no opinion for anyone, fail open to empty.
                this._etag = null;
                this._applyAndMaybeLog({}, null);
                return;
            }

            if (!status || status < 200 || status >= 300) {
                logging.warn({
                    system: {event: 'remote_flags.fetch_bad_status', statusCode: status || null}
                }, 'Remote feature flags fetch returned an unexpected status; keeping last-known-good');
                return;
            }

            let manifest: unknown;
            try {
                manifest = JSON.parse(response.body as string);
            } catch (parseErr) {
                logging.warn({
                    system: {event: 'remote_flags.parse_failed'},
                    err: parseErr
                }, 'Remote feature flags manifest was not valid JSON; keeping last-known-good');
                return;
            }

            // got lowercases response header keys, so `.etag` is the only spelling.
            const etag = (response.headers && response.headers.etag) || null;
            // Commit the ETag only after the manifest has actually been applied: if
            // apply throws, we keep the old ETag so the next poll re-fetches and
            // retries instead of getting a 304 for a manifest we never applied.
            this._applyAndMaybeLog(manifest, etag);
            this._etag = etag;
        } catch (err) {
            // Backstop: resolve()/applyOverrides shouldn't throw, but fail open if they do.
            logging.warn({
                system: {event: 'remote_flags.apply_failed'},
                err
            }, 'Remote feature flags could not be applied; keeping last-known-good');
        }
    }

    /**
     * Resolve and apply the manifest, logging only when the resolved set changes
     * (so a steady fleet doesn't log on every poll).
     * @private
     */
    _applyAndMaybeLog(manifest: unknown, etag: string | null): void {
        const resolved = resolve(manifest, {
            siteUuid: this.siteUuid
        });

        this.applyOverrides(resolved);

        // Stable-stringify (sorted keys) so a reordered-but-identical manifest isn't
        // seen as a change. JSON.stringify's 2nd arg is a key allowlist, here the sorted keys.
        const key = JSON.stringify(resolved, Object.keys(resolved).sort());
        if (key !== this._resolvedKey) {
            this._resolvedKey = key;
            logging.info({
                system: {
                    event: 'remote_flags.applied',
                    etag: etag || null,
                    flags: resolved
                }
            }, 'Remote feature flags applied');
        }
    }

    _scheduleNext(): void {
        if (!this._started) {
            return;
        }
        // Clear any existing timer so a stop/start cycle can't leave two chains running.
        if (this._timer) {
            clearTimeout(this._timer);
            this._timer = null;
        }
        const delay = this.pollInterval + Math.floor(this.getRandom() * this.jitter);
        this._timer = setTimeout(async () => {
            await this.refresh();
            this._scheduleNext();
        }, delay);
        // Never hold the process open just for the poll timer.
        if (this._timer && typeof this._timer.unref === 'function') {
            this._timer.unref();
        }
    }

    /**
     * Start polling: an immediate refresh (so boot reflects current flag state),
     * then a jittered recurring poll. Idempotent.
     */
    async start(): Promise<void> {
        if (this._started) {
            return;
        }
        this._started = true;
        await this.refresh();
        this._scheduleNext();
    }

    /**
     * Stop polling. Does not clear already-applied overrides.
     */
    stop(): void {
        this._started = false;
        if (this._timer) {
            clearTimeout(this._timer);
            this._timer = null;
        }
    }
}
