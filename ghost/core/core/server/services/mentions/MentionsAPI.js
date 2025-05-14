const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
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
 * @prop {string} [order]
 * @prop {number} page
 * @prop {number} limit
 * @prop {boolean} [unique] Only return unique mentions by source
 */

/**
 * @typedef {object} NonPaginatedOptions
 * @prop {string} [filter] A valid NQL string
 * @prop {string} [order]
 * @prop {'all'} limit
 * @prop {boolean} [unique] Only return unique mentions by source
 */

/**
 * @typedef {PaginatedOptions | NonPaginatedOptions} GetPageOptions
 */

/**
 * @typedef {object} GetAllOptions
 * @prop {string} [filter] A valid NQL string
 */

/**
 * @typedef {object} IMentionRepository
 * @prop {(mention: Mention) => Promise<void>} save
 * @prop {(options: GetPageOptions) => Promise<Page<Mention>>} getPage
 * @prop {(options: GetAllOptions) => Promise<Mention[]>} getAll
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
 * @prop {string|null} siteTitle
 * @prop {string|null} title
 * @prop {string|null} excerpt
 * @prop {string|null} author
 * @prop {URL|null} image
 * @prop {URL|null} favicon
 * @prop {string} body
 * @prop {string|undefined} contentType
 */

/**
 * @typedef {object} MentionReport
 * @prop {Date} startDate
 * @prop {Date} endDate
 * @prop {Mention[]} mentions
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
     * @param {Date} startDate
     * @param {Date} endDate
     * @returns {Promise<MentionReport>}
     */
    async getMentionReport(startDate, endDate) {
        const mentions = await this.#repository.getAll({
            filter: `created_at:>${startDate.toISOString()}+created_at:<${endDate.toISOString()}`
        });

        const report = {
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            mentions
        };

        return report;
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
                limit: options.limit,
                order: options.order,
                unique: options.unique ?? false
            };
        } else {
            pageOptions = {
                filter: options.filter,
                limit: options.limit,
                page: options.page,
                order: options.order,
                unique: options.unique ?? false
            };
        }

        const page = await this.#repository.getPage(pageOptions);

        return page;
    }

    /**
     * Update the metadata of the webmentions in the database, and delete them if they are no longer valid.
     * @param {object} options
     * @param {number|'all'} [options.limit]
     * @param {number} [options.page]
     * @param {string} [options.filter]
     */
    async refreshMentions(options) {
        const mentions = await this.#repository.getAll(options);

        for (const mention of mentions) {
            await this.#updateWebmention(mention, {
                source: mention.source,
                target: mention.target
            });
        }
    }

    async #updateWebmention(mention, webmention) {
        const isNew = !mention;
        const wasDeleted = mention?.deleted ?? false;
        const targetExists = await this.#routingService.pageExists(webmention.target);

        if (!targetExists) {
            if (!mention) {
                throw new errors.BadRequestError({
                    message: `${webmention.target} is not a valid URL for this site.`
                });
            } else {
                mention.delete();
            }
        }

        if (targetExists) {
            const resourceInfo = await this.#resourceService.getByURL(webmention.target);
            let metadata;
            try {
                metadata = await this.#webmentionMetadata.fetch(webmention.source);
                if (mention) {
                    mention.setSourceMetadata({
                        sourceTitle: metadata.title,
                        sourceSiteTitle: metadata.siteTitle,
                        sourceAuthor: metadata.author,
                        sourceExcerpt: metadata.excerpt,
                        sourceFavicon: metadata.favicon,
                        sourceFeaturedImage: metadata.image
                    });
                }
            } catch (err) {
                if (!mention) {
                    throw err;
                }
                mention.delete();
            }

            if (!mention) {
                mention = await Mention.create({
                    source: webmention.source,
                    target: webmention.target,
                    timestamp: new Date(),
                    payload: webmention.payload,
                    resourceId: resourceInfo.id ? resourceInfo.id.toHexString() : null,
                    resourceType: resourceInfo.type,
                    sourceTitle: metadata.title,
                    sourceSiteTitle: metadata.siteTitle,
                    sourceAuthor: metadata.author,
                    sourceExcerpt: metadata.excerpt,
                    sourceFavicon: metadata.favicon,
                    sourceFeaturedImage: metadata.image
                });
            }

            if (metadata?.body) {
                mention.verify(metadata.body, metadata.contentType);
            }
        }

        await this.#repository.save(mention);

        if (isNew) {
            logging.info('[Webmention] Created ' + webmention.source + ' to ' + webmention.target + ', verified: ' + mention.verified + ', deleted: ' + mention.deleted);
        } else {
            if (mention.deleted && !wasDeleted) {
                logging.info('[Webmention] Deleted ' + webmention.source + ' to ' + webmention.target + ', verified: ' + mention.verified);
            } else {
                if (!mention.deleted && wasDeleted) {
                    logging.info('[Webmention] Restored ' + webmention.source + ' to ' + webmention.target + ', verified: ' + mention.verified);
                } else {
                    logging.info('[Webmention] Updated ' + webmention.source + ' to ' + webmention.target + ', verified: ' + mention.verified + ', deleted: ' + mention.deleted);
                }
            }
        }

        return mention;
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
        let mention = await this.#repository.getBySourceAndTarget(
            webmention.source,
            webmention.target
        );

        return await this.#updateWebmention(mention, webmention);
    }
};
