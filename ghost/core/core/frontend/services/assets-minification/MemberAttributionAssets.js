const path = require('path');
const config = require('../../../shared/config');
const Minifier = require('./Minifier');
const AssetsMinificationBase = require('./AssetsMinificationBase');
const {bundleAsset} = require('../assets-bundling/bundle-asset');
const debug = require('@tryghost/debug')('member-attribution-assets');

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
            'member-attribution.min.js': 'member-attribution.bundled.js'
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
        try {
            // Step 1: Bundle the file to resolve imports
            debug('Bundling member-attribution.js');
            await bundleAsset({
                srcFile: path.join('member-attribution', 'member-attribution.js')
            });
            
            // Step 2: Minify the bundled file
            debug('Minifying bundled member-attribution.js');
            const globs = this.generateGlobs();
            const replacements = this.generateReplacements();
            await this.minify(globs, {replacements});
        } catch (error) {
            debug('Error loading member-attribution assets:', error);
            throw error;
        }
    }
};
