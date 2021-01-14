const Promise = require('bluebird');
const errors = require('@tryghost/errors');
const {extract, hasProvider} = require('oembed-parser');
const cheerio = require('cheerio');
const _ = require('lodash');
const {CookieJar} = require('tough-cookie');

const findUrlWithProvider = (url) => {
    let provider;

    // build up a list of URL variations to test against because the oembed
    // providers list is not always up to date with scheme or www vs non-www
    let baseUrl = url.replace(/^\/\/|^https?:\/\/(?:www\.)?/, '');
    let testUrls = [
        `http://${baseUrl}`,
        `https://${baseUrl}`,
        `http://www.${baseUrl}`,
        `https://www.${baseUrl}`
    ];

    for (let testUrl of testUrls) {
        provider = hasProvider(testUrl);
        if (provider) {
            url = testUrl;
            break;
        }
    }

    return {url, provider};
};

/**
 * @typedef {Object} Ii18n
 * @prop {(key: string) => string} t
 */

/**
 * @typedef {Object} IConfig
 * @prop {(key: string) => string} get
 */

/**
 * @typedef {(url: string, config: Object) => Promise} IExternalRequest
 */

class OEmbed {
    /**
     *
     * @param {Object} dependencies
     * @param {Ii18n} dependencies.i18n
     * @param {IConfig} dependencies.config
     * @param {IExternalRequest} dependencies.externalRequest
     */
    constructor({config, externalRequest, i18n}) {
        this.config = config;
        this.externalRequest = externalRequest;
        this.i18n = i18n;
    }

    unknownProvider(url) {
        return Promise.reject(new errors.ValidationError({
            message: this.i18n.t('errors.api.oembed.unknownProvider'),
            context: url
        }));
    }

    knownProvider(url) {
        return extract(url).catch((err) => {
            return Promise.reject(new errors.InternalServerError({
                message: err.message
            }));
        });
    }

    errorHandler(url) {
        return (err) => {
            // allow specific validation errors through for better error messages
            if (errors.utils.isIgnitionError(err) && err.errorType === 'ValidationError') {
                return Promise.reject(err);
            }

            // default to unknown provider to avoid leaking any app specifics
            return this.unknownProvider(url);
        };
    }

    async fetchBookmarkData(url) {
        const metascraper = require('metascraper')([
            require('metascraper-url')(),
            require('metascraper-title')(),
            require('metascraper-description')(),
            require('metascraper-author')(),
            require('metascraper-publisher')(),
            require('metascraper-image')(),
            require('metascraper-logo-favicon')(),
            require('metascraper-logo')()
        ]);

        let scraperResponse;

        try {
            const cookieJar = new CookieJar();
            const response = await this.externalRequest(url, {cookieJar});
            const html = response.body;
            scraperResponse = await metascraper({html, url});
        } catch (err) {
            return Promise.reject(err);
        }

        const metadata = Object.assign({}, scraperResponse, {
            thumbnail: scraperResponse.image,
            icon: scraperResponse.logo
        });
        // We want to use standard naming for image and logo
        delete metadata.image;
        delete metadata.logo;

        if (metadata.title) {
            return Promise.resolve({
                type: 'bookmark',
                url,
                metadata
            });
        }

        return Promise.reject(new errors.ValidationError({
            message: this.i18n.t('errors.api.oembed.insufficientMetadata'),
            context: url
        }));
    }

    isIpOrLocalhost(url) {
        try {
            const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
            const IPV6_REGEX = /:/; // fqdns will not have colons
            const HTTP_REGEX = /^https?:/i;

            const siteUrl = new URL(this.config.get('url'));
            const {protocol, hostname, host} = new URL(url);

            // allow requests to Ghost's own url through
            if (siteUrl.host === host) {
                return false;
            }

            if (!HTTP_REGEX.test(protocol) || hostname === 'localhost' || IPV4_REGEX.test(hostname) || IPV6_REGEX.test(hostname)) {
                return true;
            }

            return false;
        } catch (e) {
            return true;
        }
    }

    fetchOembedData(_url, cardType) {
        // parse the url then validate the protocol and host to make sure it's
        // http(s) and not an IP address or localhost to avoid potential access to
        // internal network endpoints
        if (this.isIpOrLocalhost(_url)) {
            return this.unknownProvider();
        }

        // check against known oembed list
        let {url, provider} = findUrlWithProvider(_url);
        if (provider) {
            return this.knownProvider(url);
        }

        // url not in oembed list so fetch it in case it's a redirect or has a
        // <link rel="alternate" type="application/json+oembed"> element
        const cookieJar = new CookieJar();
        return this.externalRequest(url, {
            method: 'GET',
            timeout: 2 * 1000,
            followRedirect: true,
            cookieJar
        }).then((pageResponse) => {
            // url changed after fetch, see if we were redirected to a known oembed
            if (pageResponse.url !== url) {
                ({url, provider} = findUrlWithProvider(pageResponse.url));
                if (provider) {
                    return this.knownProvider(url);
                }
            }

            // check for <link rel="alternate" type="application/json+oembed"> element
            let oembedUrl;
            try {
                oembedUrl = cheerio('link[type="application/json+oembed"]', pageResponse.body).attr('href');
            } catch (e) {
                return this.unknownProvider(url);
            }

            if (oembedUrl) {
                // make sure the linked url is not an ip address or localhost
                if (this.isIpOrLocalhost(oembedUrl)) {
                    return this.unknownProvider(oembedUrl);
                }

                // for standard WP oembed's we want to insert a bookmark card rather than their blockquote+script
                // which breaks in the editor and most Ghost themes. Only fallback if card type was not explicitly chosen
                if (!cardType && oembedUrl.match(/wp-json\/oembed/)) {
                    return;
                }

                // fetch oembed response from embedded rel="alternate" url
                return this.externalRequest(oembedUrl, {
                    method: 'GET',
                    json: true,
                    timeout: 2 * 1000,
                    followRedirect: true,
                    cookieJar
                }).then((oembedResponse) => {
                    // validate the fetched json against the oembed spec to avoid
                    // leaking non-oembed responses
                    const body = oembedResponse.body;
                    const hasRequiredFields = body.type && body.version;
                    const hasValidType = ['photo', 'video', 'link', 'rich'].includes(body.type);

                    if (hasRequiredFields && hasValidType) {
                        // extract known oembed fields from the response to limit leaking of unrecognised data
                        const knownFields = [
                            'type',
                            'version',
                            'html',
                            'url',
                            'title',
                            'width',
                            'height',
                            'author_name',
                            'author_url',
                            'provider_name',
                            'provider_url',
                            'thumbnail_url',
                            'thumbnail_width',
                            'thumbnail_height'
                        ];
                        const oembed = _.pick(body, knownFields);

                        // ensure we have required data for certain types
                        if (oembed.type === 'photo' && !oembed.url) {
                            return;
                        }
                        if ((oembed.type === 'video' || oembed.type === 'rich') && (!oembed.html || !oembed.width || !oembed.height)) {
                            return;
                        }

                        // return the extracted object, don't pass through the response body
                        return oembed;
                    }
                }).catch(() => {});
            }
        });
    }
}

module.exports = OEmbed;
