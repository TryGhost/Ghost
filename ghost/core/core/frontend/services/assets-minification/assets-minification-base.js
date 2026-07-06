const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');

// Minimum time between builds triggered by requests. A build that keeps
// failing (or that never produces the requested file) must not re-run for
// every incoming request. invalidate() resets the clock so config changes
// (e.g. theme activation) always rebuild immediately.
const BUILD_MIN_INTERVAL_MS = 10000;

module.exports = class AssetsMinificationBase {
    minifier;

    ready = false;
    loading = null;

    /**
     * Incremented on invalidate() so an in-flight build can detect that its
     * config went stale mid-build and re-run with the new config.
     * @private
     */
    generation = 0;

    /**
     * Timestamp (ms) of when the last build settled — used for retry backoff.
     * @private
     */
    lastBuildSettledAt = 0;

    /**
     * The error from the last failed build, if any.
     * @private
     */
    lastBuildError = null;

    constructor(options = {}) {
        this.options = options;
    }

    invalidate() {
        this.generation += 1;
        this.ready = false;
        // Deliberately do NOT clear this.loading here: an in-flight build must
        // not be forgotten, otherwise a new build could start while the old one
        // is still running and two minifier runs would execute concurrently.
        // ensureLoaded() re-runs load() when the generation changed mid-build.
        this.lastBuildSettledAt = 0;
        this.lastBuildError = null;
    }

    generateGlobs() {
        throw new errors.InternalServerError({
            message: 'generateGlobs not implemented'
        });
    }

    async load() {
        throw new errors.InternalServerError({
            message: 'load not implemented'
        });
    }

    /**
     * Ensure the assets have been built.
     *
     * - Joins an in-flight build rather than starting a second one
     * - Applies a retry backoff so a persistently failing (or non-producing)
     *   build doesn't run once per request
     * - Re-runs the build when invalidate() was called mid-build, so the
     *   result always reflects the latest config
     *
     * @returns {Promise<void>} resolves when a build has settled — rejects
     * with the build error when the build failed (or recently failed and
     * we're inside the backoff window)
     */
    ensureLoaded() {
        if (this.loading) {
            return this.loading;
        }

        if (this.lastBuildSettledAt && Date.now() - this.lastBuildSettledAt < BUILD_MIN_INTERVAL_MS) {
            return this.lastBuildError ? Promise.reject(this.lastBuildError) : Promise.resolve();
        }

        const pending = (async () => {
            let generation;
            do {
                generation = this.generation;
                await this.load();
            } while (generation !== this.generation);
            this.lastBuildError = null;
        })().catch((error) => {
            this.lastBuildError = error;
            throw error;
        }).finally(() => {
            this.lastBuildSettledAt = Date.now();
            if (this.loading === pending) {
                this.loading = null;
            }
        });
        this.loading = pending;
        return pending;
    }

    async minify(globs, options) {
        try {
            const result = await this.minifier.minify(globs, options);
            this.ready = true;
            return result;
        } catch (error) {
            if (error.code === 'EACCES') {
                logging.error('Ghost was not able to write asset files due to permissions.');
                return;
            }

            throw error;
        }
    }

    serveMiddleware() {
        const self = this;
        /**
         * @param {import('express').Request} req
         * @param {import('express').Response} res
         * @param {import('express').NextFunction} next
         */
        return async function serveMiddleware(req, res, next) {
            if (!self.ready) {
                try {
                    await self.ensureLoaded();
                } catch (error) {
                    // A failed build must not block the request — the rejection
                    // would escape the async handler and hang the request under
                    // Express 4.
                    logging.error(error);
                }
            }

            next();
        };
    }
};
