const common = require('../../lib/common');
const { extract, hasProvider } = require('oembed-parser');
const Promise = require('bluebird');
const request = require('../../lib/request');
const cheerio = require('cheerio');
const domino = require('domino');
const {getMetadata} = require('page-metadata-parser');

function generateBookmarkHtml(data)  {
    const html = `<span> Clean me! </span>`;

    return {
        html,
        metadata: data
    };
}

function escape_HTML(html_str) {

    return html_str.replace(/[&<>"]/g, function (tag) {
		var chars_to_replace = {
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;'
        };

		return chars_to_replace[tag] || tag;
	});
}

async function fetchBookmarkData(url, html) {
    if (!html) {
        const response = await request(url, {
            headers: {
                'user-agent': 'Ghost(https://github.com/TryGhost/Ghost)'
            }
        });
        html = response.body;
    }
    const doc = domino.createWindow(html).document;
    const metadata = getMetadata(doc, url);

    if (metadata.title && metadata.description) {
        let bookmarkData = generateBookmarkHtml(metadata);
        return Promise.resolve({
            type: "bookmark",
            html: bookmarkData.html,
            metadata: bookmarkData.metadata
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

    return { url, provider };
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
    ({ url, provider } = findUrlWithProvider(url));
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
            ({ url, provider } = findUrlWithProvider(response.url));
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
    })
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
        query({ data }) {
            let { url, type } = data;

            if (type === "bookmark") {
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
            }).catch((err) => {
                console.log("ERROR", err);
                return unknownProvider(url);
            });

            // fetchFromKnownProvider(url).then((response) => {
            //     if (!response) {
            //         const oembedUrl = getOembedUrlFromHTML(response.body);
            //         if (oembedUrl) {
            //             return request(oembedUrl, {
            //                 method: 'GET',
            //                 json: true
            //             }).then((response) => {
            //                 return response.body;
            //             });
            //         }
            //         return fetchBookmark();
            //     }
            //     return response;
            // }).then((response) => {
            //     if (!response) {
            //         return unknownProvider(url);
            //     }
            //     return response;
            // }).catch(() => {
            //     return unknownProvider(url);
            // });


            // let provider;
            // ({ url, provider } = findUrlWithProvider(url));

            // if (provider) {
            //     return knownProvider(url);
            // }

            // // see if the URL is a redirect to cater for shortened urls
            // return request(url, {
            //     method: 'GET',
            //     timeout: 2 * 1000,
            //     followRedirect: true
            // }).then((response) => {
            //     if (response.url !== url) {
            //         ({ url, provider } = findUrlWithProvider(response.url));
            //         if (provider) {
            //             return knownProvider(url)
            //         }
            //         // return provider ? knownProvider(url) : unknownProvider();
            //     }

            //     const oembedUrl = getOembedUrlFromHTML(response.body);

            //     if (!oembedUrl) {
            //         return unknownProvider();
            //     }

            //     return request(oembedUrl, {
            //         method: 'GET',
            //         json: true
            //     }).then((response) => {
            //         return response.body;
            //     });
            // }).catch(() => {
            //     return unknownProvider();
            // });
        }
    }
};
