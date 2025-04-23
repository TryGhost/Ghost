const path = require('path');
const config = require('../../../shared/config');
const Minifier = require('./Minifier');
const AssetsMinificationBase = require('./AssetsMinificationBase');
const {bundleAsset} = require('../assets-bundling/bundle-asset');
const debug = require('@tryghost/debug')('ghost-stats-assets');

module.exports = class GhostStatsAssets extends AssetsMinificationBase {
    constructor(options = {}) {
        super(options);

        /** @private */
        this.src = options.src || path.join(config.get('paths').assetSrc, 'ghost-stats');
        /** @private */
        this.dest = options.dest || config.getContentPath('public');

        this.minifier = new Minifier({src: this.src, dest: this.dest});
    }

    /**
     * @override
     */
    generateGlobs() {
        return {
            'ghost-stats.min.js': 'ghost-stats.bundled.js'
        };
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
            debug('Bundling ghost-stats.js');
            await bundleAsset({
                srcFile: path.join('ghost-stats', 'ghost-stats.js')
            });
            
            // Step 2: Minify the bundled file
            debug('Minifying bundled ghost-stats.js');
            const globs = this.generateGlobs();
            await this.minify(globs);
        } catch (error) {
            debug('Error loading ghost-stats assets:', error);
            throw error;
        }
    }
}; 