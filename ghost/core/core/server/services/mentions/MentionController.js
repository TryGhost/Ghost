const logging = require('@tryghost/logging');

/**
 * @typedef {import('@tryghost/webmentions/lib/webmentions').MentionsAPI} MentionsAPI
 * @typedef {import('@tryghost/webmentions/lib/webmentions').Mention} Mention
 */

/**
 * @template Model
 * @typedef {import('@tryghost/webmentions/lib/MentionsAPI').Page} Page<Model>
 */

/**
 * @typedef {object} IJobService
 * @prop {(name: string, fn: Function) => void} addJob
 */

module.exports = class MentionController {
    /** @type {import('@tryghost/webmentions/lib/MentionsAPI')} */
    #api;

    /** @type {IJobService} */
    #jobService;

    /**
     * @param {object} deps
     * @param {import('@tryghost/webmentions/lib/MentionsAPI')} deps.api
     * @param {IJobService} deps.jobService
     */
    async init(deps) {
        this.#api = deps.api;
        this.#jobService = deps.jobService;
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
        this.#jobService.addJob('processWebmention', async () => {
            const {source, target, ...payload} = frame.data;
            try {
                await this.#api.processWebmention({
                    source: new URL(source),
                    target: new URL(target),
                    payload
                });
            } catch (err) {
                logging.error(err);
            }
        });
    }
};
