const common = require('../../lib/common');
const oEmbed = require('oembed-spec');
const Promise = require('bluebird');
const request = require('../../lib/request');
const cheerio = require('cheerio');

const findUrlWithProvider = url => ({
    url,
    provider: oEmbed.findProvider(url)
});

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

            function unknownProvider() {
                return Promise.reject(new common.errors.ValidationError({
                    message: common.i18n.t('errors.api.oembed.unknownProvider'),
                    context: url
                }));
            }

            function knownProvider(provider, url) {
                return oEmbed.fetchProvider(provider, url).catch((err) => {
                    return Promise.reject(new common.errors.InternalServerError({
                        message: err.message
                    }));
                });
            }

            let provider;
            ({url, provider} = findUrlWithProvider(url));

            if (provider) {
                return knownProvider(provider, url);
            }

            // see if the URL is a redirect to cater for shortened urls
            return request(url, {
                method: 'GET',
                timeout: 2 * 1000,
                followRedirect: true
            }).then((response) => {
                if (response.url !== url) {
                    ({url, provider} = findUrlWithProvider(response.url));
                    return provider ? knownProvider(knownProvider, url) : unknownProvider();
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
