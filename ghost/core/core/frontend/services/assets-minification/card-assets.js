const debug = require('@tryghost/debug')('card-assets');
const _ = require('lodash');
const path = require('path');
const logging = require('@tryghost/logging');
const config = require('../../../shared/config');
const Minifier = require('./minifier');
const AssetsMinificationBase = require('./assets-minification-base');

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

        /**
         * Minified card assets, keyed by destination file name
         * (e.g. `{'cards.min.css': '...'}`) — the source of truth for serving.
         * @type {Object<string, string>}
         */
        this.outputs = {};
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
        if (this.files.length) {
            return this.files.indexOf(`cards.min.${type}`) > -1;
        }

        return Object.keys(this.generateGlobs()).indexOf(`cards.min.${type}`) > -1;
    }

    /**
     * Get the minified contents of a built card asset
     *
     * @param {string} filename e.g. 'cards.min.css'
     * @returns {string|null} the minified contents, or null when not built/produced
     */
    getContent(filename) {
        return this.outputs[filename] ?? null;
    }

    invalidate(cardAssetConfig) {
        if (cardAssetConfig) {
            this.config = cardAssetConfig;
        }

        return super.invalidate();
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

        debug('loading with config', this.config);

        const globs = this.generateGlobs();

        debug('globs', globs);

        // Build in memory — this is the source of truth for serving, so a
        // missing or unwritable content folder can never take the assets
        // offline. An in-memory build cannot fail with EACCES/ENOENT on the
        // destination, so a successful build is always servable.
        this.outputs = await this.minifier.minifyInMemory(globs);
        this.files = Object.keys(this.outputs);
        this.ready = true;

        // Best-effort disk write for back-compat with setups that expect the
        // built files in content/public — failures are logged and must never
        // affect serving.
        for (const [dest, contents] of Object.entries(this.outputs)) {
            try {
                await this.minifier.writeFile(contents, dest);
            } catch (error) {
                logging.warn(`Ghost was not able to write card asset ${dest} to disk — serving it from memory. Reason: ${error.message}`);
            }
        }
    }
};
