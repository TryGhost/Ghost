const oembedService = require('../oembed');

module.exports = class WebmentionMetadata {
    /**
     * @param {URL} url
     * @returns {Promise<import('@tryghost/webmentions/lib/MentionsAPI').WebmentionMetadata>}
     */
    async fetch(url) {
        const data = await oembedService.fetchOembedDataFromUrl(url.href, 'bookmark');
        const result = {
            siteTitle: data.metadata.publisher,
            title: data.metadata.title,
            excerpt: data.metadata.description,
            author: data.metadata.author,
            image: new URL(data.metadata.thumbnail),
            favicon: new URL(data.metadata.icon)
        };
        return result;
    }
};
