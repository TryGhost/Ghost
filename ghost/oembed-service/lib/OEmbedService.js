const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const logging = require('@tryghost/logging');
const cheerio = require('cheerio');
const _ = require('lodash');
const charset = require('charset');
const iconv = require('iconv-lite');

const messages = {
    noUrlProvided: 'No url provided.',
    insufficientMetadata: 'URL contains insufficient metadata.',
    unknownProvider: 'No provider found for supplied URL.',
    unauthorized: 'URL contains a private resource.'
};

/**
 * @param {string} url
 * @returns {{url: string, provider: boolean}}
 */
const findUrlWithProvider = (url) => {
    const {hasProvider} = require('@extractus/oembed-extractor');

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
 * @prop {(url: URL, externalRequest: IExternalRequest) => Promise<import('@extractus/oembed-extractor').OembedData>} getOEmbedData
 */

class OEmbedService {
    /**
     *
     * @param {Object} dependencies
     * @param {IConfig} dependencies.config
     * @param {IExternalRequest} dependencies.externalRequest
     */
    constructor({config, externalRequest}) {
        this.config = config;

        /** @type {IExternalRequest} */
        this.externalRequest = externalRequest;

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
        const {extract} = require('@extractus/oembed-extractor');

        try {
            return await extract(url);
        } catch (err) {
            if (err.message === 'Request failed with error code 401') {
                throw new errors.UnauthorizedError({
                    message: messages.unauthorized
                });
            } else {
                throw new errors.InternalServerError({
                    message: err.message
                });
            }
        }
    }

    /**
     * @param {string} url
     * @param {Object} options
     *
     * @returns {GotPromise<any>}
     */
    fetchPage(url, options) {
        return this.externalRequest(
            url,
            {
                timeout: 2000,
                followRedirect: true,
                ...options
            });
    }

    /**
     * @param {string} url
     *
     * @returns {Promise<{url: string, body: string}>}
     */
    async fetchPageHtml(url) {
        // Fetch url and get response as binary buffer to
        // avoid implicit cast
        let {headers, body, url: responseUrl} = await this.fetchPage(
            url,
            {
                encoding: 'binary',
                responseType: 'buffer'
            });

        try {
            // Detect page encoding which might not be utf-8
            // and decode content
            const encoding = charset(
                headers,
                body);

            if (encoding === null) {
                return {
                    body: body.toString(),
                    url: responseUrl
                };
            }

            const decodedBody = iconv.decode(
                body, encoding);

            return {
                body: decodedBody,
                url: responseUrl
            };
        } catch (err) {
            logging.error(err);
            //return non decoded body anyway
            return {
                body: body.toString(),
                url: responseUrl
            };
        }
    }

    /**
     * @param {string} url
     *
     * @returns {Promise<{url: string, body: Object}>}
     */
    async fetchPageJson(url) {
        const res = await this.fetchPage(url, {responseType: 'json'});
        const body = res.body;
        const pageUrl = res.url;
        return {
            body,
            url: pageUrl
        };
    }

    /**
     * @param {string} url
     * @param {string} html
     *
     * @returns {Promise<Object>}
     */
    async fetchBookmarkData(url, html) {
        const gotOpts = {};

        if (process.env.NODE_ENV?.startsWith('test')) {
            gotOpts.retry = 0;
        }

        const metascraper = require('metascraper')([
            require('metascraper-url')(),
            require('metascraper-title')(),
            require('metascraper-description')(),
            require('metascraper-author')(),
            require('metascraper-publisher')(),
            require('metascraper-image')(),
            require('metascraper-logo-favicon')({
                gotOpts
            }),
            require('metascraper-logo')()
        ]);

        let scraperResponse;

        try {
            scraperResponse = await metascraper({html, url});
        } catch (err) {
            // Log to avoid being blind to errors happenning in metascraper
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
     * @param {string} html
     * @param {string} [cardType]
     *
     * @returns {Promise<Object>}
     */
    async fetchOembedData(url, html, cardType) {
        // check for <link rel="alternate" type="application/json+oembed"> element
        let oembedUrl;
        try {
            oembedUrl = cheerio('link[type="application/json+oembed"]', html).attr('href');
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
            const oembedResponse = await this.fetchPageJson(oembedUrl);
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

            if (type !== 'bookmark' && type !== 'mention') {
                // if not a bookmark request, first
                // check against known oembed list
                const {url: providerUrl, provider} = findUrlWithProvider(url);
                if (provider) {
                    return this.knownProvider(providerUrl);
                }
            }

            // Not in the list, we need to fetch the content
            const {url: pageUrl, body} = await this.fetchPageHtml(url);

            // fetch only bookmark when explicitly requested
            if (type === 'bookmark') {
                return this.fetchBookmarkData(url, body);
            }

            // mentions need to return bookmark data (metadata) and body (html) for link verification
            if (type === 'mention') {
                const bookmark = await this.fetchBookmarkData(url, body);
                return {...bookmark, body};
            }

            // attempt to fetch oembed

            // In case response was a redirect, see if we were
            // redirected to a known oembed
            if (pageUrl !== url) {
                const {url: providerUrl, provider} = findUrlWithProvider(pageUrl);
                if (provider) {
                    return this.knownProvider(providerUrl);
                }
            }

            let data = await this.fetchOembedData(url, body);

            // fallback to bookmark when we can't get oembed
            if (!data && !type) {
                data = await this.fetchBookmarkData(url, body);
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

module.exports = OEmbedService;
