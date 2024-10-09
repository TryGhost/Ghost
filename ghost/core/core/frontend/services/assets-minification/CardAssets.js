const debug = require('@tryghost/debug')('card-assets');
const Minifier = require('@tryghost/minifier');
const _ = require('lodash');
const path = require('path');
const config = require('../../../shared/config');
const AssetsMinificationBase = require('./AssetsMinificationBase');

module.exports = class CardAssets extends AssetsMinificationBase {
    constructor(options = {}) {
        super(options);

        this.src = options.src || path.join(config.get('paths').assetSrc, 'cards');
        this.dest = options.dest || config.getContentPath('public');
        this.minifier = new Minifier({src: this.src, dest: this.dest});

        if ('config' in options) {
            this.config = options.config;
        }

        this.files = [];
    }

    /**
     * @override
     */
    generateGlobs() {
        // CASE: The theme has asked for all card assets to be included by default
        if (this.config === true) {
            return {
                'cards.min.css': 'css/*.css',
                'cards.min.js': 'js/*.js'
            };
        }

        // CASE: the theme has declared an include directive, we should include exactly these assets
        // Include rules take precedence over exclude rules.
        if (_.has(this.config, 'include')) {
            return {
                'cards.min.css': `css/@(${this.config.include.join('|')}).css`,
                'cards.min.js': `js/@(${this.config.include.join('|')}).js`
            };
        }

        // CASE: the theme has declared an exclude directive, we should include exactly these assets
        if (_.has(this.config, 'exclude')) {
            return {
                'cards.min.css': `css/!(${this.config.exclude.join('|')}).css`,
                'cards.min.js': `js/!(${this.config.exclude.join('|')}).js`
            };
        }

        // CASE: theme has asked that no assets be included
        // CASE: we didn't understand config, don't do anything
        return {};
    }

    hasFile(type) {
        return Object.keys(this.generateGlobs()).indexOf(`cards.min.${type}`) > -1;
    }

    /**
     * A theme can declare which cards it supports, and we'll do the rest
     *
     * @override
     */
    async load(cardAssetConfig) {
        if (cardAssetConfig) {
            this.config = cardAssetConfig;
        }

        debug('loading with config', cardAssetConfig);

        await this.clearFiles();

        const globs = this.generateGlobs();

        debug('globs', globs);

        this.files = await this.minify(globs) || [];
    }
};
