const Minifier = require('@tryghost/minifier');
const path = require('path');
const config = require('../../../shared/config');
const AssetsMinificationBase = require('./AssetsMinificationBase');

module.exports = class MemberAttributionAssets extends AssetsMinificationBase {
    constructor(options = {}) {
        super(options);

        /** @private */
        this.src = options.src || path.join(config.get('paths').assetSrc, 'member-attribution');
        /** @private */
        this.dest = options.dest || config.getContentPath('public');

        this.minifier = new Minifier({src: this.src, dest: this.dest});
    }

    /**
     * @override
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
     * Minify, move into the destination directory, and clear existing asset files.
     *
     * @override
     * @returns {Promise<void>}
     */
    async load() {
        const globs = this.generateGlobs();
        const replacements = this.generateReplacements();
        await this.clearFiles();
        await this.minify(globs, {replacements});
    }
};