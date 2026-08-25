const debug = require('@tryghost/debug')('card-assets');
const errors = require('@tryghost/errors');
const _ = require('lodash');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const config = require('../../../shared/config');

// Must match the asset-hash service so both flavours of ?v= look alike
const HASH_LENGTH = 16;

// Each type maps card names to minified chunks; anything else still indexes
// and concatenates, serving garbage under a valid content hash
const isChunkMap = (chunks) =>
  _.isPlainObject(chunks) && Object.values(chunks).every((chunk) => typeof chunk === 'string');

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
    this.manifestPath =
      options.manifest || path.join(config.get('paths').publicFilePath, 'cards.manifest.json');

    if ('config' in options) {
      this.config = options.config;
    }

    // Read eagerly so a broken build fails at boot rather than at render time
    this.manifest = this.readManifest();
    this.bundles = new Map();
  }

  /**
   * @returns {{css?: Object<string, string>, js?: Object<string, string>}}
   */
  readManifest() {
    let reason;

    try {
      const manifest = JSON.parse(fs.readFileSync(this.manifestPath, 'utf8'));

      // Well-formed JSON isn't necessarily a manifest
      if (!_.isPlainObject(manifest)) {
        reason = `Expected an object, got ${JSON.stringify(manifest).slice(0, 50)}`;
      } else {
        const present = ['css', 'js'].filter((type) => type in manifest);
        const badType = present.find((type) => !isChunkMap(manifest[type]));

        if (!present.length) {
          reason = 'Expected at least one of `css` or `js`';
        } else if (badType) {
          reason = `Expected \`${badType}\` to map card names to minified chunks`;
        } else {
          return manifest;
        }
      }
    } catch (err) {
      reason = err.message;
    }

    throw new errors.InternalServerError({
      message: `Could not use the card asset manifest at ${this.manifestPath}`,
      context: reason,
      help: 'Card assets ship with Ghost — reinstall, or run `pnpm build:assets` when running from source',
    });
  }

  /**
   * Resolve the theme's `card_assets` config against the cards this Ghost
   * version actually ships
   *
   * @param {'css'|'js'} type
   * @returns {string[]} card names, in bundle order
   */
  getCardNames(type) {
    const available = Object.keys(this.manifest[type] || {});

    // CASE: The theme has asked for all card assets to be included by default
    if (this.config === true) {
      return available;
    }

    // CASE: the theme has declared an include directive, we should include exactly these assets
    // Include rules take precedence over exclude rules.
    if (_.has(this.config, 'include')) {
      return available.filter((name) => this.config.include.includes(name));
    }

    // CASE: the theme has declared an exclude directive, we should include everything else
    if (_.has(this.config, 'exclude')) {
      return available.filter((name) => !this.config.exclude.includes(name));
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

    const chunks = this.manifest[type] || {};
    const names = this.getCardNames(type);

    debug('bundling', type, names);

    // JS chunks are terminated so a minifier that drops the trailing
    // semicolon can't let one IIFE run into the next
    const separator = type === 'js' ? ';\n' : '\n';
    const content = names.map((name) => chunks[name]).join(separator);

    const bundle = content
      ? {
          content,
          hash: crypto
            .createHash('sha256')
            .update(content)
            .digest('base64url')
            .substring(0, HASH_LENGTH),
        }
      : null;

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
   * @param {string} assetPath e.g. `public/cards.min.css`
   * @returns {'css'|'js'|null} the card asset type this path refers to, if any
   */
  getCardType(assetPath) {
    return assetPath.match(/^public\/cards\.min\.(css|js)$/)?.[1] ?? null;
  }

  /**
   * @param {boolean|object} [cardAssetConfig] the active theme's `card_assets` config
   */
  invalidate(cardAssetConfig) {
    if (cardAssetConfig !== undefined) {
      this.config = cardAssetConfig;
    }

    this.bundles.clear();
  }
};
