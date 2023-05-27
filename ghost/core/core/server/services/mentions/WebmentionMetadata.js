const oembedService = require('../oembed');

module.exports = class WebmentionMetadata {
    /**
     * @param {URL} url
     * @returns {Promise<import('@tryghost/webmentions/lib/MentionsAPI').WebmentionMetadata>}
     */
    async fetch(url) {
        const data = await oembedService.fetchOembedDataFromUrl(url.href, 'mention');
        const result = {
            siteTitle: data.metadata.publisher,
            title: data.metadata.title,
            excerpt: data.metadata.description,
            author: data.metadata.author,
            image: data.metadata.thumbnail ? new URL(data.metadata.thumbnail) : null,
            favicon: data.metadata.icon ? new URL(data.metadata.icon) : null,
            body: data.body
        };
        return result;
    }
};
