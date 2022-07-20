// const debug = require('@tryghost/debug')('comments-counts-assets');
const Minifier = require('@tryghost/minifier');
const path = require('path');
const fs = require('fs').promises;
const logging = require('@tryghost/logging');
const config = require('../../../shared/config');

class AdminAuthAssetsService {
    constructor(options = {}) {
        /** @private */
        this.src = options.src || path.join(config.get('paths').assetSrc, 'admin-auth');
        /** @private */
        this.dest = options.dest || path.join(config.getContentPath('public'), 'admin-auth');
        /** @private */
        this.minifier = new Minifier({src: this.src, dest: this.dest});
    }

    /**
     * @private
     */
    generateGlobs() {
        return {
            'admin-auth.min.js': '*.js'
        };
    }

    /**
     * @private
     * @returns {Promise<void>}
     */
    async minify(globs) {
        try {
            await this.minifier.minify(globs);
        } catch (error) {
            if (error.code === 'EACCES') {
                logging.error('Ghost was not able to write admin-auth asset files due to permissions.');
                return;
            }

            throw error;
        }
    }

    /**
     * @private
     * @returns {Promise<void>}
     */
    async copyStatic() {
        try {
            await fs.copyFile(path.join(this.src, 'index.html'), path.join(this.dest, 'index.html'));
        } catch (error) {
            if (error.code === 'EACCES') {
                logging.error('Ghost was not able to write admin-auth asset files due to permissions.');
                return;
            }

            throw error;
        }
    }

    /**
     * @private
     * @returns {Promise<void>}
     */
    async clearFiles() {
        const rmFile = async (name) => {
            await fs.unlink(path.join(this.dest, name));
        };

        let promises = [
            // @deprecated switch this to use fs.rm when we drop support for Node v12
            rmFile('admin-auth.min.js'),
            rmFile('index.html')
        ];

        // We don't care if removing these files fails as it's valid for them to not exist
        await Promise.allSettled(promises);
    }

    /**
     * Minify, move into the destination directory, and clear existing asset files.
     *
     * @returns {Promise<void>}
     */
    async load() {
        const globs = this.generateGlobs();
        await this.clearFiles();
        await this.minify(globs);
        await this.copyStatic();
    }
}

module.exports = AdminAuthAssetsService;
