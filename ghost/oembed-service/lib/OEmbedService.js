const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const logging = require('@tryghost/logging');
const _ = require('lodash');
const charset = require('charset');
const iconv = require('iconv-lite');
const path = require('path');

// Some sites block non-standard user agents so we need to mimic a typical browser
const USER_AGENT = 'Mozilla/5.0 (compatible; Ghost/5.0; +https://ghost.org/)';

const messages = {
    noUrlProvided: 'No url provided.',
    insufficientMetadata: 'URL contains insufficient metadata.',
    unknownProvider: 'No provider found for supplied URL.',
    unableToFetchOembed: 'Unable to fetch requested embed.',
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
        `https://${baseUrl}`,
        `https://www.${baseUrl}`,
        `http://${baseUrl}`,
        `http://www.${baseUrl}`
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
 * @typedef {Object} IStorage
 * @prop {(feature: string) => Object} getStorage
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
     * @param {IStorage} dependencies.storage
     * @param {IExternalRequest} dependencies.externalRequest
     */
    constructor({config, externalRequest, storage}) {
        this.config = config;
        this.storage = storage;

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
            if (err.message === 'Request failed with error code 401' || err.message === 'Request failed with error code 403') {
                throw new errors.ValidationError({
                    message: tpl(messages.unableToFetchOembed),
                    context: messages.unauthorized
                });
            }

            throw new errors.ValidationError({
                message: tpl(messages.unableToFetchOembed),
                context: err.message
            });
        }
    }

    /**
     * Fetches the image buffer from a URL using fetch
     * @param {String} imageUrl - URL of the image to fetch
     * @returns {Promise<Buffer>} - Promise resolving to the image buffer
     */
    async fetchImageBuffer(imageUrl) {
        const response = await fetch(imageUrl);
        
        if (!response.ok) {
            throw Error(`Failed to fetch image: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        
        const buffer = Buffer.from(arrayBuffer);
        return buffer;
    }

    /**
     * Process and store image from a URL
     * @param {String} imageUrl - URL of the image to process
     * @param {String} imageType - What is the image used for. Example - icon, thumbnail
     * @returns {Promise<String>} - URL where the image is stored
     */
    async processImageFromUrl(imageUrl, imageType) {
        // Fetch image buffer from the URL
        const imageBuffer = await this.fetchImageBuffer(imageUrl);

        // Extract file name from URL
        const fileName = path.basename(new URL(imageUrl).pathname);

        const targetPath = path.join(imageType, fileName);

        const imageStoredUrl = await this.storage.getStorage('images').saveRaw(imageBuffer, targetPath);

        return imageStoredUrl;
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
                headers: {
                    'user-agent': USER_AGENT
                },
                timeout: 2000,
                followRedirect: true,
                ...options
            });
    }

    /**
     * @param {string} url
     * @param {Object} options
     *
     * @returns {Promise<{url: string, body: string, contentType: string|undefined}>}
     */
    async fetchPageHtml(url, options = {}) {
        // Fetch url and get response as binary buffer to
        // avoid implicit cast
        let {headers, body, url: responseUrl} = await this.fetchPage(
            url,
            {
                encoding: 'binary',
                responseType: 'buffer',
                ...options
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
                    url: responseUrl,
                    contentType: headers['content-type']
                };
            }

            const decodedBody = iconv.decode(
                body, encoding);

            return {
                body: decodedBody,
                url: responseUrl,
                contentType: headers['content-type']
            };
        } catch (err) {
            logging.error(err);
            //return non decoded body anyway
            return {
                body: body.toString(),
                url: responseUrl,
                contentType: headers['content-type']
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
        const gotOpts = {
            headers: {
                'User-Agent': USER_AGENT
            }
        };

        if (process.env.NODE_ENV?.startsWith('test')) {
            gotOpts.retry = 0;
        }

        const pickFn = (sizes, pickDefault) => {
            // Prioritize apple touch icon with sizes > 180
            const appleTouchIcon = sizes.find(item => item.rel?.includes('apple') && item.sizes && item.size.width >= 180);
            const svgIcon = sizes.find(item => item.href?.endsWith('svg'));
            return appleTouchIcon || svgIcon || pickDefault(sizes);
        };

        const metascraper = require('metascraper')([
            require('metascraper-url')(),
            require('metascraper-title')(),
            require('metascraper-description')(),
            require('metascraper-author')(),
            require('metascraper-publisher')(),
            require('metascraper-image')(),
            require('metascraper-logo-favicon')({
                gotOpts,
                pickFn
            }),
            require('metascraper-logo')()
        ]);

        let scraperResponse;

        try {
            scraperResponse = await metascraper({
                html,
                url,
                // In development, allow non-standard TLDs
                validateUrl: this.config.get('env') !== 'development'
            });
        } catch (err) {
            // Log to avoid being blind to errors happening in metascraper
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

        await this.processImageFromUrl(metadata.icon, 'icon')
            .then((processedImageUrl) => {
                metadata.icon = processedImageUrl;
            }).catch((err) => {
                metadata.icon = 'https://static.ghost.org/v5.0.0/images/link-icon.svg';
                logging.error(err);
            });

        await this.processImageFromUrl(metadata.thumbnail, 'thumbnail')
            .then((processedImageUrl) => {
                metadata.thumbnail = processedImageUrl;
            }).catch((err) => {
                logging.error(err);
            });

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
        // Lazy require the library to keep boot quick
        const cheerio = require('cheerio');

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

                // Fallback to bookmark if it's a link type
                if (oembed.type === 'link') {
                    return;
                }

                // ensure we have required data for certain types
                if (oembed.type === 'photo' && !oembed.url) {
                    return;
                }
                if ((oembed.type === 'video' || oembed.type === 'rich') && (!oembed.html || !oembed.width)) {
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
     * @param {Object} [options] Specific fetch options
     * @param {number} [options.timeout] Change the default timeout for fetching html
     *
     * @returns {Promise<Object>}
     */
    async fetchOembedDataFromUrl(url, type, options = {}) {
        try {
            const urlObject = new URL(url);

            // YouTube has started not returning oembed <link>tags for some live URLs
            // when fetched from an IP address that's in a non-EN region.
            // We convert live URLs to watch URLs so we can go straight to the
            // oembed request via a known provider rather than going through the page fetch routine.
            const ytLiveRegex = /^\/live\/([a-zA-Z0-9_-]+)$/;
            if (urlObject.hostname.match(/(?:www\.)?youtube\.com/) && ytLiveRegex.test(urlObject.pathname)) {
                const videoId = ytLiveRegex.exec(urlObject.pathname)[1];
                urlObject.pathname = '/watch';
                urlObject.searchParams.set('v', videoId);
                url = urlObject.toString();
            }

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
            const {url: pageUrl, body, contentType} = await this.fetchPageHtml(url, options);

            // fetch only bookmark when explicitly requested
            if (type === 'bookmark') {
                return this.fetchBookmarkData(url, body);
            }

            // mentions need to return bookmark data (metadata) and body (html) for link verification
            if (type === 'mention') {
                if (contentType.includes('application/json')) {
                    // No need to fetch metadata: we have none
                    const bookmark = {
                        version: '1.0',
                        type: 'bookmark',
                        url,
                        metadata: {
                            title: null,
                            description: null,
                            publisher: null,
                            author: null,
                            thumbnail: null,
                            icon: null
                        },
                        contentType
                    };
                    return {...bookmark, body};
                }
                const bookmark = await this.fetchBookmarkData(url, body);
                return {...bookmark, body, contentType};
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
