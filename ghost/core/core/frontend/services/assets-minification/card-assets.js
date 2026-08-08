const debug = require('@tryghost/debug')('card-assets');
const logging = require('@tryghost/logging');
const _ = require('lodash');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const config = require('../../../shared/config');

// Must match the asset-hash service so both flavours of ?v= look alike
const HASH_LENGTH = 16;

const TYPES = ['css', 'js'];

/**
 * Card assets are built ahead of time by scripts/build-card-assets.mjs, which
 * minifies every card's CSS/JS into a manifest. The only per-site variable is
 * which cards the active theme asked for, so serving is a matter of picking
 * chunks out of the manifest and concatenating them.
 *
 * Keeping this in memory (rather than minifying to content/public on first
 * request, as Ghost used to) means the bundle — and the content hash we put in
 * its ?v= — is identical for every process serving a given theme, so caches
 * survive restarts and are shared across instances.
 */
module.exports = class CardAssets {
    constructor(options = {}) {
        this.src = options.src || path.join(config.get('paths').assetSrc, 'cards');
        this.manifestPath = options.manifest || path.join(config.get('paths').publicFilePath, 'cards.manifest.json');

        if ('config' in options) {
            this.config = options.config;
        }

        this.manifest = null;
        this.bundles = new Map();
    }

    /**
     * @returns {{css: Object<string, string>, js: Object<string, string>}}
     */
    getManifest() {
        if (!this.manifest) {
            this.manifest = this.readManifest();
        }

        return this.manifest;
    }

    readManifest() {
        try {
            return JSON.parse(fs.readFileSync(this.manifestPath, 'utf8'));
        } catch (err) {
            if (err.code !== 'ENOENT') {
                throw err;
            }
        }

        // The manifest is a build artefact, so it's absent when Ghost is run
        // from a source checkout without `pnpm build:assets`. Fall back to the
        // unminified sources so development still works.
        logging.warn(`Card asset manifest not found at ${this.manifestPath}, serving unminified card assets. Run \`pnpm build:assets\` to build it.`);

        return this.readSources();
    }

    readSources() {
        const manifest = {};

        for (const type of TYPES) {
            manifest[type] = {};

            const dir = path.join(this.src, type);
            const suffix = `.${type}`;

            let entries;
            try {
                entries = fs.readdirSync(dir);
            } catch (err) {
                if (err.code === 'ENOENT') {
                    continue;
                }
                throw err;
            }

            // Sorted so the concatenation order — and therefore the hash — doesn't
            // depend on the order the filesystem happens to return entries in
            for (const entry of entries.filter(file => file.endsWith(suffix)).sort()) {
                manifest[type][entry.slice(0, -suffix.length)] = fs.readFileSync(path.join(dir, entry), 'utf8');
            }
        }

        return manifest;
    }

    /**
     * Resolve the theme's `card_assets` config against the cards this Ghost
     * version actually ships
     *
     * @param {'css'|'js'} type
     * @returns {string[]} card names, in bundle order
     */
    getCardNames(type) {
        const available = Object.keys(this.getManifest()[type] || {});

        // CASE: The theme has asked for all card assets to be included by default
        if (this.config === true) {
            return available;
        }

        // CASE: the theme has declared an include directive, we should include exactly these assets
        // Include rules take precedence over exclude rules.
        if (_.has(this.config, 'include')) {
            return available.filter(name => this.config.include.includes(name));
        }

        // CASE: the theme has declared an exclude directive, we should include everything else
        if (_.has(this.config, 'exclude')) {
            return available.filter(name => !this.config.exclude.includes(name));
        }

        // CASE: theme has asked that no assets be included
        // CASE: we didn't understand config, don't do anything
        return [];
    }

    /**
     * @param {'css'|'js'} type
     * @returns {{content: string, hash: string}|null} null when the theme wants no assets of this type
     */
    getBundle(type) {
        if (this.bundles.has(type)) {
            return this.bundles.get(type);
        }

        const chunks = this.getManifest()[type] || {};
        const names = this.getCardNames(type);

        debug('bundling', type, names);

        // JS chunks are terminated so a minifier that drops the trailing
        // semicolon can't let one IIFE run into the next
        const separator = type === 'js' ? ';\n' : '\n';
        const content = names.map(name => chunks[name]).join(separator);

        const bundle = content ? {
            content,
            hash: crypto.createHash('sha256').update(content).digest('base64url').substring(0, HASH_LENGTH)
        } : null;

        this.bundles.set(type, bundle);

        return bundle;
    }

    hasFile(type) {
        return !!this.getBundle(type);
    }

    /**
     * @param {'css'|'js'} type
     * @returns {string|null} content hash for use as a cache-busting key
     */
    getHash(type) {
        return this.getBundle(type)?.hash ?? null;
    }

    /**
     * @param {boolean|object} [cardAssetConfig] the active theme's `card_assets` config
     */
    invalidate(cardAssetConfig) {
        if (cardAssetConfig !== undefined) {
            this.config = cardAssetConfig;
        }

        this.manifest = null;
        this.bundles.clear();
    }
};
