// const debug = require('@tryghost/debug')('comments-counts-assets');
const Minifier = require('@tryghost/minifier');
const path = require('path');
const fs = require('fs').promises;
const logging = require('@tryghost/logging');
const config = require('../../../shared/config');

class MemberAttributionAssetsService {
    constructor(options = {}) {
        /** @private */
        this.src = options.src || path.join(config.get('paths').assetSrc, 'member-attribution');
        /** @private */
        this.dest = options.dest || config.getContentPath('public');
        /** @private */
        this.minifier = new Minifier({src: this.src, dest: this.dest});
    }

    /**
     * @private
     */
    generateGlobs() {
        return {
            'member-attribution.min.js': '*.js'
        };
    }

    /**
     * @private
     */
    generateReplacements() {
        return {};
    }

    /**
     * @private
     * @returns {Promise<void>}
     */
    async minify(globs, options) {
        try {
            await this.minifier.minify(globs, options);
        } catch (error) {
            if (error.code === 'EACCES') {
                logging.error('Ghost was not able to write member-attribution asset files due to permissions.');
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

        const promises = [];
        for (const key of Object.keys(this.generateGlobs())) {
            // @deprecated switch this to use fs.rm when we drop support for Node v12
            promises.push(rmFile(key));
        }

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
        const replacements = this.generateReplacements();
        await this.clearFiles();
        await this.minify(globs, {replacements});
    }
}

module.exports = MemberAttributionAssetsService;
