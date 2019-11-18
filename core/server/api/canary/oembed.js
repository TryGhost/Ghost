const common = require('../../lib/common');
const {extract, hasProvider} = require('oembed-parser');
const Promise = require('bluebird');
const request = require('../../lib/request');
const cheerio = require('cheerio');

async function fetchBookmarkData(url, html) {
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

    if (!html) {
        const response = await request(url, {
            headers: {
                'user-agent': 'Ghost(https://github.com/TryGhost/Ghost)'
            }
        });
        html = response.body;
    }
    const scraperResponse = await metascraper({html, url});
    const metadata = Object.assign({}, scraperResponse, {
        thumbnail: scraperResponse.image,
        icon: scraperResponse.logo
    });
    // We want to use standard naming for image and logo
    delete metadata.image;
    delete metadata.logo;

    if (metadata.title && metadata.description) {
        return Promise.resolve({
            type: 'bookmark',
            url,
            metadata
        });
    }
    return Promise.resolve();
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

const getOembedUrlFromHTML = (html) => {
    return cheerio('link[type="application/json+oembed"]', html).attr('href');
};

function unknownProvider(url) {
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

function fetchOembedData(url) {
    let provider;
    ({url, provider} = findUrlWithProvider(url));
    if (provider) {
        return knownProvider(url);
    }
    return request(url, {
        method: 'GET',
        timeout: 2 * 1000,
        followRedirect: true,
        headers: {
            'user-agent': 'Ghost(https://github.com/TryGhost/Ghost)'
        }
    }).then((response) => {
        if (response.url !== url) {
            ({url, provider} = findUrlWithProvider(response.url));
        }
        if (provider) {
            return knownProvider(url);
        }
        const oembedUrl = getOembedUrlFromHTML(response.body);
        if (oembedUrl) {
            return request(oembedUrl, {
                method: 'GET',
                json: true
            }).then((response) => {
                return response.body;
            }).catch(() => {});
        }
    });
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
                return fetchBookmarkData(url);
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
            }).catch(() => {
                return unknownProvider(url);
            });
        }
    }
};
