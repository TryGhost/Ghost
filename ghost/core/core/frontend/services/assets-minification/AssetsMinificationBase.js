const path = require('path');
const fs = require('fs').promises;
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');

module.exports = class AssetsMinificationBase {
    minifier;

    ready = false;

    constructor(options = {}) {
        this.options = options;
    }

    invalidate() {
        this.ready = false;
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
     * @returns {Promise<void>}
     */
    async clearFiles() {
        const rmFile = async (name) => {
            await fs.unlink(path.join(this.dest, name));
        };

        const promises = [];
        for (const key of Object.keys(this.generateGlobs())) {
            // @deprecated switch this to use fs.rm when we drop support for Node v12
            promises.push(rmFile(key));
        }

        // We don't care if removing these files fails as it's valid for them to not exist
        await Promise.allSettled(promises);
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
                await self.load();
            }

            next();
        };
    }
};
