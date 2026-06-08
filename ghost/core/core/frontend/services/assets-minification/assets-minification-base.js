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
            if (!self.ready) {
                if (!self.loading) {
                    const pending = self.load().finally(() => {
                        if (self.loading === pending) {
                            self.loading = null;
                        }
                    });
                    self.loading = pending;
                }
                await self.loading;
            }

            next();
        };
    }
};
