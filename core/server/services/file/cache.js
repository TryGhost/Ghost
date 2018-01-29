'use strict';

const fs = require('fs-extra'),
    path = require('path'),
    security = require('../../lib/security'),
    common = require('../../lib/common'),
    urlService = require('../url');

// `core/server/public`
class PublicFileCache {
    constructor() {
        this.cache = {};

        common.events.once('server:start', () => {
            this.set('ghost-sdk.js', {dynamic: true});
            this.set('ghost-sdk.min.js', {dynamic: true});

            this.set('ghost.css');
            this.set('ghost.min.css');

            this.set('404-ghost@2x.png');
            this.set('404-ghost.png');

            this.set('sitemap.xsl', {dynamic: true});
            this.set('robots.txt', {dynamic: true});
        });
    }

    get(filePath) {
        return this.cache[filePath.replace(/\/?public\/?/, '')];
    }

    set(filePath, options) {
        options = options || {};

        fs.readFile(path.resolve(__dirname, '..', '..', 'public', filePath))
            .then((bytes) => {
                if (options.dynamic) {
                    bytes = bytes.toString().replace(/(\{\{blog-url\}\})/g, urlService.utils.urlFor('home', true).replace(/\/$/, ''));
                    bytes = bytes.toString().replace(/(\{\{api-url\}\})/g, urlService.utils.urlFor('api', {cors: true}, true));
                }

                this.cache[filePath] = bytes;
            })
            .catch(() => {
                common.logging.warn(`Unable to cache ${filePath}`);
            });
    }

    getHash(filePath, options) {
        options = options || {};
        const cachedFile = this.get(filePath);

        if (!cachedFile) {
            return null;
        }

        return security.crypto.md5({
            value: this.get(filePath),
            len: options.len
        });
    }
}

module.exports.public = new PublicFileCache();
