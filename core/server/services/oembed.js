const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const logging = require('@tryghost/logging');
const sentry = require('../../shared/sentry');
const {extract, hasProvider} = require('oembed-parser');
const cheerio = require('cheerio');
const _ = require('lodash');
const {CookieJar} = require('tough-cookie');

const messages = {
    noUrlProvided: 'No url provided.',
    insufficientMetadata: 'URL contains insufficient metadata.'
};

/**
 * @param {string} url
 * @returns {{url: string, provider: boolean}}
 */
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
 * @typedef {Object} IConfig
 * @prop {(key: string) => string} get
 */

/**
 * @typedef {(url: string, config: Object) => Promise} IExternalRequest
 */

/**
 * @typedef {object} ICustomProvider
 * @prop {(url: URL) => Promise<boolean>} canSupportRequest
 * @prop {(url: URL, externalRequest: IExternalRequest) => Promise<import('oembed-parser').OembedData>} getOEmbedData
 */

class OEmbed {
    /**
     *
     * @param {Object} dependencies
     * @param {IConfig} dependencies.config
     * @param {IExternalRequest} dependencies.externalRequest
     */
    constructor({config, externalRequest}) {
        this.config = config;

        /** @type {IExternalRequest} */
        this.externalRequest = async (url, requestConfig) => {
            if (this.isIpOrLocalhost(url)) {
                return this.unknownProvider(url);
            }
            const response = await externalRequest(url, requestConfig);
            if (this.isIpOrLocalhost(response.url)) {
                return this.unknownProvider(url);
            }
            return response;
        };

        /** @type {ICustomProvider[]} */
        this.customProviders = [];
    }

    /**
     * @param {ICustomProvider} provider
     */
    registerProvider(provider) {
        this.customProviders.push(provider);
    }

    /**
     * @param {string} url
     */
    async unknownProvider(url) {
        throw new errors.ValidationError({
            message: tpl(messages.unknownProvider),
            context: url
        });
    }

    /**
     * @param {string} url
     */
    async knownProvider(url) {
        try {
            return await extract(url);
        } catch (err) {
            throw new errors.InternalServerError({
                message: err.message
            });
        }
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

        const cookieJar = new CookieJar();
        const response = await this.externalRequest(url, {cookieJar});

        const html = response.body;
        try {
            scraperResponse = await metascraper({html, url});
        } catch (err) {
            // Log to avoid being blind to errors happenning in metascraper
            sentry.captureException(err);
            logging.error(err);
            return this.unknownProvider(url);
        }

        const metadata = Object.assign({}, scraperResponse, {
            thumbnail: scraperResponse.image,
            icon: scraperResponse.logo
        });
        // We want to use standard naming for image and logo
        delete metadata.image;
        delete metadata.logo;

        if (!metadata.title) {
            throw new errors.ValidationError({
                message: tpl(messages.insufficientMetadata),
                context: url
            });
        }

        return {
            version: '1.0',
            type: 'bookmark',
            url,
            metadata
        };
    }

    /**
     * @param {string} url
     * @returns {boolean}
     */
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

    /**
     * @param {string} _url
     * @param {string} [cardType]
     *
     * @returns {Promise<Object>}
     */
    async fetchOembedData(_url, cardType) {
        // check against known oembed list
        let {url, provider} = findUrlWithProvider(_url);
        if (provider) {
            return this.knownProvider(url);
        }

        // url not in oembed list so fetch it in case it's a redirect or has a
        // <link rel="alternate" type="application/json+oembed"> element
        const cookieJar = new CookieJar();
        const pageResponse = await this.externalRequest(url, {
            method: 'GET',
            timeout: 2 * 1000,
            followRedirect: true,
            cookieJar
        });
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
            // for standard WP oembed's we want to insert a bookmark card rather than their blockquote+script
            // which breaks in the editor and most Ghost themes. Only fallback if card type was not explicitly chosen
            if (!cardType && oembedUrl.match(/wp-json\/oembed/)) {
                return;
            }

            // fetch oembed response from embedded rel="alternate" url
            const oembedResponse = await this.externalRequest(oembedUrl, {
                method: 'GET',
                json: true,
                timeout: 2 * 1000,
                followRedirect: true,
                cookieJar
            });
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
        }
    }

    /**
     * @param {string} url - oembed URL
     * @param {string} type - card type
     *
     * @returns {Promise<Object>}
     */
    async fetchOembedDataFromUrl(url, type) {
        try {
            const urlObject = new URL(url);

            // Trimming solves the difference of url validation between `new URL(url)`
            // and metascraper.
            url = url.trim();

            for (const provider of this.customProviders) {
                if (await provider.canSupportRequest(urlObject)) {
                    const result = await provider.getOEmbedData(urlObject, this.externalRequest);
                    if (result !== null) {
                        return result;
                    }
                }
            }

            // fetch only bookmark when explicitly requested
            if (type === 'bookmark') {
                return this.fetchBookmarkData(url);
            }

            // attempt to fetch oembed
            let data = await this.fetchOembedData(url);

            // fallback to bookmark when we can't get oembed
            if (!data && !type) {
                data = await this.fetchBookmarkData(url);
            }

            // couldn't get anything, throw a validation error
            if (!data) {
                return this.unknownProvider(url);
            }

            return data;
        } catch (err) {
            // allow specific validation errors through for better error messages
            if (errors.utils.isGhostError(err) && err.errorType === 'ValidationError') {
                throw err;
            }

            // log the real error because we're going to throw a generic "Unknown provider" error
            logging.error(new errors.InternalServerError({
                message: 'Encountered error when fetching oembed',
                err
            }));

            // default to unknown provider to avoid leaking any app specifics
            return this.unknownProvider(url);
        }
    }
}

module.exports = OEmbed;
