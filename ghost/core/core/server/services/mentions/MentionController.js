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
 * @typedef {object} MentionResource
 * @prop {ObjectID} id
 * @prop {string} type
 * @prop {string} name
 */

/**
 * @typedef {Mention} MentionDTO
 * @prop {Resource} resource
 */

/**
 * @typedef {object} IJobService
 * @prop {(name: string, fn: Function) => void} addJob
 */

/**
 * @typedef {object} IMentionResourceService
 * @prop {(id: ObjectID)  => Promise<MentionResource>} getByID
 */

module.exports = class MentionController {
    /** @type {import('@tryghost/webmentions/lib/MentionsAPI')} */
    #api;

    /** @type {IJobService} */
    #jobService;

    /** @type {IMentionResourceService} */
    #mentionResourceService;

    /**
     * @param {object} deps
     * @param {import('@tryghost/webmentions/lib/MentionsAPI')} deps.api
     * @param {IJobService} deps.jobService
     * @param {IMentionResourceService} deps.mentionResourceService
     */
    async init(deps) {
        this.#api = deps.api;
        this.#jobService = deps.jobService;
        this.#mentionResourceService = deps.mentionResourceService;
    }

    /**
     * @param {import('@tryghost/api-framework').Frame} frame
     * @returns {Promise<Page<MentionDTO>>}
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

        let order;
        if (frame.options.order && frame.options.order === 'created_at desc') {
            order = 'created_at desc';
        } else {
            order = 'created_at asc';
        }

        let unique;
        if (frame.options.unique && (frame.options.unique === 'true' || frame.options.unique === true)) {
            unique = true;
        }

        const mentions = await this.#api.listMentions({
            filter: frame.options.filter,
            order,
            limit,
            page,
            unique
        });

        const resources = await Promise.all(mentions.data.map((mention) => {
            return this.#mentionResourceService.getByID(mention.resourceId);
        }));

        /** @type {Page<MentionDTO>} */
        const result = {
            data: mentions.data.map((mention, index) => {
                const mentionDTO = {
                    ...mention.toJSON(),
                    resource: resources[index],
                    toJSON() {
                        return mentionDTO;
                    }
                };
                delete mentionDTO.resourceId;
                return mentionDTO;
            }),
            meta: mentions.meta
        };

        return result;
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
