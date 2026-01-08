const oembedService = require('../oembed');

module.exports = class WebmentionMetadata {
    /**
     * Helpers that change the URL for which metadata for a given external resource is fetched. Return undefined to now handle the URL.
     * @type {((url: URL) => URL|undefined)[]}
     */
    #mappers = [];

    /**
     * @param {(url: URL) => URL|undefined} mapper
     */
    addMapper(mapper) {
        this.#mappers.push(mapper);
    }

    /**
     *
     * @param {URL} url
     */
    #getMappedUrl(url) {
        for (const mapper of this.#mappers) {
            const mappedUrl = mapper(url);
            if (mappedUrl) {
                return this.#getMappedUrl(mappedUrl);
            }
        }
        return url;
    }

    /**
     * @param {URL} url
     * @returns {Promise<import('./mentions-api').WebmentionMetadata>}
     */
    async fetch(url) {
        const mappedUrl = this.#getMappedUrl(url);
        const data = await oembedService.fetchOembedDataFromUrl(mappedUrl.href, 'mention', {
            timeout: 15000,
            retry: {
                // Only retry on network issues, or specific HTTP status codes
                limit: 3
            }
        });

        const result = {
            siteTitle: data.metadata.publisher,
            title: data.metadata.title,
            excerpt: data.metadata.description,
            author: data.metadata.author,
            image: data.metadata.thumbnail ? new URL(data.metadata.thumbnail) : null,
            favicon: data.metadata.icon ? new URL(data.metadata.icon) : null,
            body: data.body,
            contentType: data.contentType
        };

        if (mappedUrl.href !== url.href) {
            // Still need to fetch body and contentType separately now
            // For verification
            const {body, contentType} = await oembedService.fetchPageHtml(url, {
                timeout: 15000,
                retry: {
                    // Only retry on network issues, or specific HTTP status codes
                    limit: 3
                }
            });
            result.body = body;
            result.contentType = contentType;
        }
        return result;
    }
};
