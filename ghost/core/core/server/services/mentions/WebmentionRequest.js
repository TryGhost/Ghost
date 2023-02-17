const logging = require('@tryghost/logging');
const oembedService = require('../oembed');

module.exports = class WebmentionRequest {
    /**
     * @param {URL} url
     * @returns {Promise<{html: string}>}
     */
    async fetch(url) {
        try {
            const data = await oembedService.fetchPageHtml(url.href);
            return {
                html: data.body
            };
        } catch (err) {
            logging.warn(err);
            return null;
        }
    }
};
