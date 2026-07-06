const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');

// Minimum time between build attempts so a persistently failing or
// non-producing build doesn't add minification cost to every request.
const BUILD_MIN_INTERVAL_MS = 10000;

module.exports = class AssetsMinificationBase {
    minifier;

    ready = false;
    loading = null;

    constructor(options = {}) {
        this.options = options;
        this.generation = 0;
        this.lastBuildSettledAt = 0;
        this.lastBuildError = null;
    }

    invalidate() {
        this.generation += 1;
        this.ready = false;
        // Deliberately do NOT clear `this.loading` here — nulling it while a
        // build is in flight would let a second concurrent minifier run
        // interleave writes on the same files. ensureLoaded() re-runs load()
        // once the in-flight build settles (see the generation loop).
        //
        // Resetting the settle clock makes the next build happen immediately
        // (e.g. on theme switch) despite the retry backoff.
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

    /**
     * Ensure a build has run (or is running), applying all rebuild policy in
     * one place: single-flight (concurrent callers share one build), a retry
     * backoff after a settled build, and re-running the build when it is
     * invalidated mid-flight.
     *
     * The backoff also covers builds that resolve without producing assets
     * (e.g. EACCES is swallowed by minify() and `ready` stays false): callers
     * checking `!this.ready` on every request won't trigger a minification
     * run per request.
     *
     * @returns {Promise<void>} resolves when the build settles; rejects with
     * the build error (stored errors are re-thrown within the backoff window)
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
                    // Express 4. Downstream middleware serves the previous
                    // build or 404s.
                    logging.error(error);
                }
            }

            next();
        };
    }
};
