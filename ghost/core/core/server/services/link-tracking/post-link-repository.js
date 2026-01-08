const FullPostLink = require('./full-post-link');
const _ = require('lodash');

/**
 * @typedef {import('bson-objectid').default} ObjectID
 * @typedef {import('./post-link')} PostLink
 */

module.exports = class PostLinkRepository {
    /** @type {Object} */
    #LinkRedirect;
    /** @type {Object} */
    #linkRedirectRepository;

    /**
     * @param {object} deps
     * @param {object} deps.LinkRedirect Bookshelf Model
     * @param {object} deps.linkRedirectRepository Bookshelf Model
     */
    constructor(deps) {
        this.#LinkRedirect = deps.LinkRedirect;
        this.#linkRedirectRepository = deps.linkRedirectRepository;
    }

    /**
     *
     * @param {*} options
     * @returns {Promise<InstanceType<FullPostLink>[]>}
     */
    async getAll(options) {
        // Create a collection with applied filters
        const itemCollection = this.#LinkRedirect.forge();

        // Apply default and custom filters from the options
        if (options.filter) {
            itemCollection.applyDefaultAndCustomFilters({filter: options.filter});
        }

        // Apply ordering
        itemCollection.query((qb) => {
            qb.orderByRaw('`count__clicks` DESC, `to` DESC');
        });

        // Fetch the collection with the applied query modifications
        const collection = await itemCollection.fetchAll({withRelated: ['count.clicks']});

        const result = [];

        for (const model of collection.models) {
            const link = this.#linkRedirectRepository.fromModel(model);

            result.push(
                new FullPostLink({
                    post_id: model.get('post_id'),
                    link,
                    count: {
                        clicks: model.get('count__clicks')
                    }
                })
            );
        }

        return result;
    }

    async updateLinks(linkIds, updateData, options) {
        const bulkUpdateOptions = _.pick(options, ['transacting']);

        const bulkActionResult = await this.#LinkRedirect.bulkEdit(linkIds, 'redirects', {
            ...bulkUpdateOptions,
            data: updateData
        });

        return {
            bulk: {
                action: 'updateLink',
                meta: {
                    stats: {
                        successful: bulkActionResult.successful,
                        unsuccessful: bulkActionResult.unsuccessful
                    },
                    errors: bulkActionResult.errors,
                    unsuccessfulData: bulkActionResult.unsuccessfulData
                }
            }
        };
    }

    /**
     * @param {PostLink} postLink
     * @returns {Promise<void>}
     */
    async save(postLink) {
        await this.#LinkRedirect.edit({
            post_id: postLink.post_id.toHexString()
        }, {
            id: postLink.link_id.toHexString(),
            importing: true // skip setting updated_at when linking a post to a link
        });
    }
};
