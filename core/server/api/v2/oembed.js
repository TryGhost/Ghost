const common = require('../../lib/common');
const {extract, hasProvider} = require('oembed-parser');
const Promise = require('bluebird');
const request = require('../../lib/request');
const cheerio = require('cheerio');

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

const getOembedUrlFromHTML = (html) => {
    return cheerio('link[type="application/json+oembed"]', html).attr('href');
};

module.exports = {
    docName: 'oembed',

    read: {
        permissions: false,
        data: [
            'url'
        ],
        options: [],
        query({data}) {
            let {url} = data;

            if (!url || !url.trim()) {
                return Promise.reject(new common.errors.BadRequestError({
                    message: common.i18n.t('errors.api.oembed.noUrlProvided')
                }));
            }

            function unknownProvider() {
                return Promise.reject(new common.errors.ValidationError({
                    message: common.i18n.t('errors.api.oembed.unknownProvider')
                }));
            }

            function knownProvider(url) {
                return extract(url).catch((err) => {
                    return Promise.reject(new common.errors.InternalServerError({
                        message: err.message
                    }));
                });
            }

            let provider;
            ({url, provider} = findUrlWithProvider(url));

            if (provider) {
                return knownProvider(url);
            }

            // see if the URL is a redirect to cater for shortened urls
            return request(url, {
                method: 'GET',
                timeout: 2 * 1000,
                followRedirect: true
            }).then((response) => {
                if (response.url !== url) {
                    ({url, provider} = findUrlWithProvider(response.url));
                    return provider ? knownProvider(url) : unknownProvider();
                }

                const oembedUrl = getOembedUrlFromHTML(response.body);

                if (!oembedUrl) {
                    return unknownProvider();
                }

                return request(oembedUrl, {
                    method: 'GET',
                    json: true
                }).then((response) => {
                    return response.body;
                });
            }).catch(() => {
                return unknownProvider();
            });
        }
    }
};
