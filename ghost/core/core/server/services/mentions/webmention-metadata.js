const oembedService = require('../oembed');

function isTransientError(err) {
    const statusCode = err.statusCode || err.response?.statusCode;
    return statusCode === 429 || statusCode === 503 || err.name === 'TimeoutError' || err.code === 'ETIMEDOUT';
}

function tagFetchError(err) {
    err.transient = isTransientError(err);
    return err;
}

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
        let data;
        try {
            data = await oembedService.fetchOembedDataFromUrl(mappedUrl.href, 'mention', {
                timeout: {
                    request: 15000
                },
                retry: {
                    // Only retry on network issues, or specific HTTP status codes
                    limit: 3
                },
                shouldRethrowFetchError: isTransientError
            });
        } catch (err) {
            throw tagFetchError(err);
        }

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
            try {
                const {body, contentType} = await oembedService.fetchPageHtml(url, {
                    timeout: {
                        request: 15000
                    },
                    retry: {
                        // Only retry on network issues, or specific HTTP status codes
                        limit: 3
                    }
                });
                result.body = body;
                result.contentType = contentType;
            } catch (err) {
                throw tagFetchError(err);
            }
        }
        return result;
    }
};
