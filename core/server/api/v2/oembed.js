const common = require('../../lib/common');
const {extract, hasProvider} = require('oembed-parser');
const Promise = require('bluebird');
const request = require('../../lib/request');
const cheerio = require('cheerio');

// TODO: extract the oembed + unfurl fallback logic into the Koenig repo?

// TODO: memoize this on first access for startup speed?
const metascraper = require('metascraper')([
    require('metascraper-title')(),
    require('metascraper-description')(),
    require('metascraper-author')(),
    require('metascraper-date')(),
    require('metascraper-image')(),
    require('metascraper-logo')(),
    require('metascraper-logo-favicon')(),
    require('metascraper-publisher')(),
    require('metascraper-lang')(),
    require('metascraper-amazon')()
]);

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
                console.log({url});
                return Promise.reject(new common.errors.BadRequestError({
                    message: common.i18n.t('errors.api.oembed.noUrlProvided')
                }));
            }

            function unknownProvider() {
                return Promise.reject(new common.errors.ValidationError({
                    message: common.i18n.t('errors.api.oembed.unknownProvider'),
                    context: url
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
                    if (provider) {
                        return knownProvider(url);
                    }
                }

                const oembedUrl = getOembedUrlFromHTML(response.body);

                if (!oembedUrl) {
                    // attempt to perform a non-oembed unfurl
                    // TODO: pull this out into it's own function and do proper html generation
                    // NOTE: styles are required because classes are not available when using an iframe - bookmark card may help here
                    return metascraper({html: response.body, url}).then((metadata) => {
                        let html = `
                            <article style="border: 1px solid; border-radius: .5rem">
                                <a href="${url}" style="display: flex">
                                    <article style="display: flex; flex-direction: column; padding: 1.2rem;">
                                        <span style="font-weight: 500">${metadata.title}</span>
                                        <span>${metadata.description}</span>
                                        <span style="display: flex; align-items: center">
                                            ${metadata.logo ? '<img src="' + metadata.logo + '" style="width: 2rem; margin-right: .8rem">' : ''}
                                            ${metadata.author}
                                            ${metadata.author && metadata.publisher ? ' @ ' : ''}
                                            ${metadata.publisher}
                                        </span>
                                        <span style="font-style: italic">${url}</span>
                                    </article>
                                    ${metadata.image ? '<img src="' + metadata.image + '" style="max-width: 20rem">' : ''}
                                </a>
                            </article>
                        `;

                        return {
                            html,
                            metadata,
                            type: 'bookmark'
                        };
                    }).catch((err) => {
                        console.log('metascraper err', err);
                        return unknownProvider();
                    });
                }

                return request(oembedUrl, {
                    method: 'GET',
                    json: true
                }).then((response) => {
                    return response.body;
                });
            }).catch((err) => {
                console.log('request err', err);
                return unknownProvider();
            });
        }
    }
};
