const errors = require('@tryghost/errors');
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

/**
 * @typedef {object} ResourceResult
 * @prop {string | null} type
 * @prop {import('bson-objectid').default | null} id
 */

/**
 * @typedef {object} IResourceService
 * @prop {(url: URL) => Promise<ResourceResult>} getByURL
 */

/**
 * @typedef {object} IRoutingService
 * @prop {(url: URL) => Promise<boolean>} pageExists
 */

/**
 * @typedef {object} WebmentionMetadata
 * @prop {string} siteTitle
 * @prop {string} title
 * @prop {string} excerpt
 * @prop {string} author
 * @prop {URL} image
 * @prop {URL} favicon
 */

/**
 * @typedef {object} IWebmentionMetadata
 * @prop {(url: URL) => Promise<WebmentionMetadata>} fetch
 */

module.exports = class MentionsAPI {
    /** @type {IMentionRepository} */
    #repository;
    /** @type {IResourceService} */
    #resourceService;
    /** @type {IRoutingService} */
    #routingService;
    /** @type {IWebmentionMetadata} */
    #webmentionMetadata;

    /**
     * @param {object} deps
     * @param {IMentionRepository} deps.repository
     * @param {IResourceService} deps.resourceService
     * @param {IRoutingService} deps.routingService
     * @param {IWebmentionMetadata} deps.webmentionMetadata
     */
    constructor(deps) {
        this.#repository = deps.repository;
        this.#resourceService = deps.resourceService;
        this.#routingService = deps.routingService;
        this.#webmentionMetadata = deps.webmentionMetadata;
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
        const targetExists = await this.#routingService.pageExists(webmention.target);

        if (!targetExists) {
            throw new errors.BadRequestError({
                message: `${webmention.target} is not a valid URL for this site.`
            });
        }

        const resourceInfo = await this.#resourceService.getByURL(webmention.target);

        const metadata = await this.#webmentionMetadata.fetch(webmention.source);

        let mention = await this.#repository.getBySourceAndTarget(
            webmention.source,
            webmention.target
        );

        if (!mention) {
            mention = await Mention.create({
                source: webmention.source,
                target: webmention.target,
                timestamp: new Date(),
                payload: webmention.payload,
                resourceId: resourceInfo.type === 'post' ? resourceInfo.id : null,
                sourceTitle: metadata.title,
                sourceSiteTitle: metadata.siteTitle,
                sourceAuthor: metadata.author,
                sourceExcerpt: metadata.excerpt,
                sourceFavicon: metadata.favicon,
                sourceFeaturedImage: metadata.image
            });
        }
        await this.#repository.save(mention);

        return mention;
    }
};
