const Minifier = require('@tryghost/minifier');
const path = require('path');
const config = require('../../../shared/config');
const AssetsMinificationBase = require('./AssetsMinificationBase');

module.exports = class CommentCountsAssets extends AssetsMinificationBase {
    constructor(options = {}) {
        super(options);

        this.src = options.src || path.join(config.get('paths').assetSrc, 'comment-counts');
        this.dest = options.dest || config.getContentPath('public');
        this.minifier = new Minifier({src: this.src, dest: this.dest});

        this.files = [];
    }

    /**
     * @override
     */
    generateGlobs() {
        return {
            'comment-counts.min.js': 'js/*.js'
        };
    }

    /**
     * @override
     */
    async load() {
        const globs = this.generateGlobs();
        this.files = await this.minify(globs);
    }
};
