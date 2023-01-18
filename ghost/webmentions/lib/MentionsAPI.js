const Mention = require('./Mention');

/**
 * @template Model
 * @typedef {object} Page<Model>
 * @prop {Model[]} data
 * @prop {object} meta
 * @prop {object} meta.pagination
 * @prop {number} meta.pagination.page - The current page
 * @prop {number} meta.pagination.pages - The total number of pages
 * @prop {number | 'all'} meta.pagination.limit - The limit of models per page
 * @prop {number} meta.pagination.total - The total number of models across all pages
 * @prop {number|null} meta.pagination.prev - The number of the previous page, or null if there isn't one
 * @prop {number|null} meta.pagination.next - The number of the next page, or null if there isn't one
 */

/**
 * @typedef {object} PaginatedOptions
 * @prop {string} [filter] A valid NQL string
 * @prop {number} page
 * @prop {number} limit
 */

/**
 * @typedef {object} NonPaginatedOptions
 * @prop {string} [filter] A valid NQL string
 * @prop {'all'} limit
 */

/**
 * @typedef {PaginatedOptions | NonPaginatedOptions} GetPageOptions
 */

/**
 * @typedef {object} IMentionRepository
 * @prop {(mention: Mention) => Promise<void>} save
 * @prop {(options: GetPageOptions) => Promise<Page<Mention>>} getPage
 * @prop {(source: URL, target: URL) => Promise<Mention>} getBySourceAndTarget
 */

module.exports = class MentionsAPI {
    /** @type {IMentionRepository} */
    #repository;

    constructor(deps) {
        this.#repository = deps.repository;
    }

    /**
     * @param {object} options
     * @returns {Promise<Page<Mention>>}
     */
    async listMentions(options) {
        /** @type {GetPageOptions} */
        let pageOptions;

        if (options.limit === 'all') {
            pageOptions = {
                filter: options.filter,
                limit: options.limit
            };
        } else {
            pageOptions = {
                filter: options.filter,
                limit: options.limit,
                page: options.page
            };
        }

        const page = await this.#repository.getPage(pageOptions);

        return page;
    }

    /**
     * @param {object} webmention
     * @param {URL} webmention.source
     * @param {URL} webmention.target
     * @param {Object<string, any>} webmention.payload
     *
     * @returns {Promise<Mention>}
     */
    async processWebmention(webmention) {
        const existing = await this.#repository.getBySourceAndTarget(
            webmention.source,
            webmention.target
        );

        if (existing) {
            await this.#repository.save(existing);
            return existing;
        }

        const mention = await Mention.create({
            source: webmention.source,
            target: webmention.target,
            timestamp: new Date(),
            payload: webmention.payload,
            resourceId: null,
            sourceTitle: 'Fake title',
            sourceSiteTitle: 'Awesome Site',
            sourceAuthor: 'James Bond',
            sourceExcerpt: 'Wow, what an awesome article, blah blah blah',
            sourceFavicon: null,
            sourceFeaturedImage: null
        });

        await this.#repository.save(mention);

        return mention;
    }
};
