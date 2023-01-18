const logging = require('@tryghost/logging');

/**
 * @typedef {import('@tryghost/webmentions/lib/webmentions').MentionsAPI} MentionsAPI
 * @typedef {import('@tryghost/webmentions/lib/webmentions').Mention} Mention
 */

/**
 * @template Model
 * @typedef {import('@tryghost/webmentions/lib/MentionsAPI').Page} Page<Model>
 */

module.exports = class MentionController {
    /** @type {import('@tryghost/webmentions/lib/MentionsAPI')} */
    #api;

    async init(deps) {
        this.#api = deps.api;
    }

    /**
     * @param {import('@tryghost/api-framework').Frame} frame
     * @returns {Promise<Page<Mention>>}
     */
    async browse(frame) {
        let limit;
        if (!frame.options.limit || frame.options.limit === 'all') {
            limit = 'all';
        } else {
            limit = parseInt(frame.options.limit);
        }

        let page;
        if (frame.options.page) {
            page = parseInt(frame.options.page);
        } else {
            page = 1;
        }

        const results = await this.#api.listMentions({
            filter: frame.options.filter,
            limit,
            page
        });

        return results;
    }

    /**
     * @param {import('@tryghost/api-framework').Frame} frame
     * @returns {Promise<void>}
     */
    async receive(frame) {
        logging.info('[Webmention] ' + JSON.stringify(frame.data));
        const {source, target, ...payload} = frame.data;
        const result = this.#api.processWebmention({
            source: new URL(source),
            target: new URL(target),
            payload
        });

        result.catch(function rejected(err) {
            logging.error(err);
        });
    }
};
