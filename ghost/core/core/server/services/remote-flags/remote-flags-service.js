const logging = require('@tryghost/logging');
const resolve = require('./resolve');

const DEFAULT_POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_JITTER_MS = 60 * 1000; // up to 1 minute of spread per poll
const REQUEST_TIMEOUT_MS = 10 * 1000;

/**
 * Polls a remote JSON manifest of feature-flag overrides, resolves it for this
 * site, and pushes the result into the labs service. Designed to be unconditionally
 * fail-open: a missing, broken, or unreachable manifest must never change live flag
 * state in a way that takes the site down, so every failure path either keeps the
 * last-known-good overrides or clears them, and nothing here ever throws out.
 *
 * The HTTP client, the known-flags source, and the override sink are all injected so
 * the polling/caching/fail-open logic can be unit-tested without real I/O or timers.
 */
class RemoteFlagsService {
    /**
     * @param {object} deps
     * @param {string} deps.url - canonical manifest URL (one per environment)
     * @param {number|string} deps.siteId - this container's Pro site id
     * @param {function(): string[]} deps.getKnownFlags - returns the overridable flag keys
     * @param {function(Object<string, boolean>): void} deps.applyOverrides - sink for resolved overrides (labs.setRemoteOverrides)
     * @param {function(string, object): Promise} deps.request - @tryghost/request-compatible client
     * @param {number} [deps.pollInterval] - base poll interval in ms
     * @param {number} [deps.jitter] - max random extra delay per poll in ms
     * @param {function(): number} [deps.getRandom] - returns 0..1 (injectable for tests)
     */
    constructor(deps) {
        this.url = deps.url;
        this.siteId = deps.siteId;
        this.getKnownFlags = deps.getKnownFlags;
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
     * Fetch the manifest once, resolve it for this site, and apply it. Always
     * fail-open; never rejects. Not re-entrant: overlapping calls are coalesced so
     * concurrent refreshes can never race the cached ETag.
     * @returns {Promise<void>}
     */
    async refresh() {
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
    async _doRefresh() {
        let response;
        try {
            const headers = {};
            if (this._etag) {
                headers['if-none-match'] = this._etag;
            }
            response = await this.request(this.url, {
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
                system: {event: 'remote_flags.fetch_failed', siteId: this.siteId},
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
                    system: {event: 'remote_flags.fetch_bad_status', siteId: this.siteId, statusCode: status || null}
                }, 'Remote feature flags fetch returned an unexpected status; keeping last-known-good');
                return;
            }

            let manifest;
            try {
                manifest = JSON.parse(response.body);
            } catch (parseErr) {
                logging.warn({
                    system: {event: 'remote_flags.parse_failed', siteId: this.siteId},
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
            // Defensive backstop: resolve()/applyOverrides should not throw, but if
            // anything does, fail open rather than letting it escape the poll loop.
            logging.warn({
                system: {event: 'remote_flags.apply_failed', siteId: this.siteId},
                err
            }, 'Remote feature flags could not be applied; keeping last-known-good');
        }
    }

    /**
     * Resolve a manifest for this site, push it to the override sink, and emit a
     * structured log only when the resolved set actually changes (so a steady fleet
     * does not log on every poll).
     * @private
     */
    _applyAndMaybeLog(manifest, etag) {
        const resolved = resolve(manifest, {
            siteId: this.siteId,
            knownFlags: this.getKnownFlags()
        });

        this.applyOverrides(resolved);

        // Canonicalise with sorted keys so a manifest that only reorders its keys
        // does not look "changed" and emit a spurious applied log on every container.
        const key = JSON.stringify(resolved, Object.keys(resolved).sort());
        if (key !== this._resolvedKey) {
            this._resolvedKey = key;
            logging.info({
                system: {
                    event: 'remote_flags.applied',
                    siteId: this.siteId,
                    etag: etag || null,
                    flags: resolved
                }
            }, 'Remote feature flags applied');
        }
    }

    _scheduleNext() {
        if (!this._started) {
            return;
        }
        // Ensure a single outstanding timer even across a stop/start cycle where an
        // in-flight callback could otherwise schedule a second chain.
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
     * @returns {Promise<void>}
     */
    async start() {
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
    stop() {
        this._started = false;
        if (this._timer) {
            clearTimeout(this._timer);
            this._timer = null;
        }
    }
}

module.exports = RemoteFlagsService;
