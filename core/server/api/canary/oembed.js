const errors = require('@tryghost/errors');
const {extract, hasProvider} = require('oembed-parser');
const Promise = require('bluebird');
const cheerio = require('cheerio');
const _ = require('lodash');
const {CookieJar} = require('tough-cookie');
const config = require('../../../shared/config');
const {i18n} = require('../../lib/common');
const externalRequest = require('../../lib/request-external');

async function fetchBookmarkData(url) {
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
        const response = await externalRequest(url, {cookieJar});
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
        message: i18n.t('errors.api.oembed.insufficientMetadata'),
        context: url
    }));
}

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

function unknownProvider(url) {
    return Promise.reject(new errors.ValidationError({
        message: i18n.t('errors.api.oembed.unknownProvider'),
        context: url
    }));
}

function knownProvider(url) {
    return extract(url, {maxwidth: 1280}).catch((err) => {
        return Promise.reject(new errors.InternalServerError({
            message: err.message
        }));
    });
}

function isIpOrLocalhost(url) {
    try {
        const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const IPV6_REGEX = /:/; // fqdns will not have colons
        const HTTP_REGEX = /^https?:/i;

        const siteUrl = new URL(config.get('url'));
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

function fetchOembedData(_url, cardType) {
    // parse the url then validate the protocol and host to make sure it's
    // http(s) and not an IP address or localhost to avoid potential access to
    // internal network endpoints
    if (isIpOrLocalhost(_url)) {
        return unknownProvider();
    }

    // check against known oembed list
    let {url, provider} = findUrlWithProvider(_url);
    if (provider) {
        return knownProvider(url);
    }

    // url not in oembed list so fetch it in case it's a redirect or has a
    // <link rel="alternate" type="application/json+oembed"> element
    const cookieJar = new CookieJar();
    return externalRequest(url, {
        method: 'GET',
        timeout: 2 * 1000,
        followRedirect: true,
        cookieJar
    }).then((pageResponse) => {
        // url changed after fetch, see if we were redirected to a known oembed
        if (pageResponse.url !== url) {
            ({url, provider} = findUrlWithProvider(pageResponse.url));
            if (provider) {
                return knownProvider(url);
            }
        }

        // check for <link rel="alternate" type="application/json+oembed"> element
        let oembedUrl;
        try {
            oembedUrl = cheerio('link[type="application/json+oembed"]', pageResponse.body).attr('href');
        } catch (e) {
            return unknownProvider(url);
        }

        if (oembedUrl) {
            // make sure the linked url is not an ip address or localhost
            if (isIpOrLocalhost(oembedUrl)) {
                return unknownProvider(oembedUrl);
            }

            // for standard WP oembed's we want to insert a bookmark card rather than their blockquote+script
            // which breaks in the editor and most Ghost themes. Only fallback if card type was not explicitly chosen
            if (!cardType && oembedUrl.match(/wp-json\/oembed/)) {
                return;
            }

            // fetch oembed response from embedded rel="alternate" url
            return externalRequest(oembedUrl, {
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

function errorHandler(url) {
    return function (err) {
        // allow specific validation errors through for better error messages
        if (errors.utils.isIgnitionError(err) && err.errorType === 'ValidationError') {
            return Promise.reject(err);
        }

        // default to unknown provider to avoid leaking any app specifics
        return unknownProvider(url);
    };
}

module.exports = {
    docName: 'oembed',

    read: {
        permissions: false,
        data: [
            'url',
            'type'
        ],
        options: [],
        query({data}) {
            let {url, type} = data;

            if (type === 'bookmark') {
                return fetchBookmarkData(url)
                    .catch(errorHandler(url));
            }

            return fetchOembedData(url).then((response) => {
                if (!response && !type) {
                    return fetchBookmarkData(url);
                }
                return response;
            }).then((response) => {
                if (!response) {
                    return unknownProvider(url);
                }
                return response;
            }).catch(errorHandler(url));
        }
    }
};
