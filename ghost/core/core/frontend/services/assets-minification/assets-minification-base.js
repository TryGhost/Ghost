const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');

module.exports = class AssetsMinificationBase {
    minifier;

    ready = false;
    loading = null;

    constructor(options = {}) {
        this.options = options;
    }

    invalidate() {
        this.ready = false;
        this.loading = null;
    }

    /**
     * Ensure an asset build has run, joining an in-flight load() when one
     * exists so concurrent callers only trigger a single build. Used both by
     * serveMiddleware() and as a recovery path when a built file has gone
     * missing from disk at runtime.
     *
     * @returns {Promise<void>}
     */
    ensureLoaded() {
        if (!this.loading) {
            const pending = this.load().finally(() => {
                if (this.loading === pending) {
                    this.loading = null;
                }
            });
            this.loading = pending;
        }

        return this.loading;
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

    serveMiddleware() {
        const self = this;
        /**
         * @param {import('express').Request} req
         * @param {import('express').Response} res
         * @param {import('express').NextFunction} next
         */
        return async function serveMiddleware(req, res, next) {
            // Wait when assets are not built yet, but also when a build is in
            // flight (e.g. the ENOENT recovery rebuild) — reading while the
            // minifier truncates/rewrites the files would serve partial assets
            if (!self.ready || self.loading) {
                try {
                    await self.ensureLoaded();
                } catch (error) {
                    // A failed build must not block the request — without this
                    // the rejection escapes the express handler and the request
                    // hangs. The file middleware downstream serves the previous
                    // build, or responds with a 404 if there is none.
                    logging.error(error);
                }
            }

            next();
        };
    }
};
