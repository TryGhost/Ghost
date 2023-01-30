const {Mention} = require('@tryghost/webmentions');
const logging = require('@tryghost/logging');

/**
 * @typedef {import('@tryghost/webmentions/lib/MentionsAPI').IMentionRepository} IMentionRepository
 */

/**
 * @template Model
 * @typedef {import('@tryghost/webmentions/lib/MentionsAPI').Page<Model>} Page
 */

/**
 * @typedef {import('@tryghost/webmentions/lib/MentionsAPI').GetPageOptions} GetPageOptions
 */

/**
 * @implements {IMentionRepository}
 */
module.exports = class BookshelfMentionRepository {
    /** @type {Object} */
    #MentionModel;

    /** @type {import('@tryghost/domain-events')} */
    #DomainEvents;

    /**
     * @param {object} deps
     * @param {object} deps.MentionModel Bookshelf Model
     * @param {import('@tryghost/domain-events')} deps.DomainEvents
     */
    constructor(deps) {
        this.#MentionModel = deps.MentionModel;
        this.#DomainEvents = deps.DomainEvents;
    }

    #modelToMention(model) {
        let payload;
        try {
            payload = JSON.parse(model.get('payload'));
        } catch (err) {
            logging.error(err);
            payload = {};
        }
        return Mention.create({
            id: model.get('id'),
            source: model.get('source'),
            target: model.get('target'),
            timestamp: model.get('created_at'),
            payload,
            resourceId: model.get('resource_id'),
            sourceTitle: model.get('source_title'),
            sourceSiteTitle: model.get('source_site_title'),
            sourceAuthor: model.get('source_author'),
            sourceExcerpt: model.get('source_excerpt'),
            sourceFavicon: model.get('source_favicon'),
            sourceFeaturedImage: model.get('source_featured_image')
        });
    }

    /**
     * @param {GetPageOptions} options
     * @returns {Promise<Page<import('@tryghost/webmentions/lib/Mention')>>}
     */
    async getPage(options) {
        const page = await this.#MentionModel.findPage(options);

        return {
            data: await Promise.all(page.data.map(model => this.#modelToMention(model))),
            meta: page.meta
        };
    }

    /**
     * @param {URL} source
     * @param {URL} target
     * @returns {Promise<import('@tryghost/webmentions/lib/Mention')|null>}
     */
    async getBySourceAndTarget(source, target) {
        const model = await this.#MentionModel.findOne({
            source: source.href,
            target: target.href
        }, {require: false});

        if (!model) {
            return null;
        }

        return this.#modelToMention(model);
    }

    /**
     * @param {import('@tryghost/webmentions/lib/Mention')} mention
     * @returns {Promise<void>}
     */
    async save(mention) {
        const data = {
            id: mention.id.toHexString(),
            source: mention.source.href,
            source_title: mention.sourceTitle,
            source_site_title: mention.sourceSiteTitle,
            source_excerpt: mention.sourceExcerpt,
            source_author: mention.sourceAuthor,
            source_featured_image: mention.sourceFeaturedImage?.href,
            source_favicon: mention.sourceFavicon?.href,
            target: mention.target.href,
            resource_id: mention.resourceId?.toHexString(),
            resource_type: mention.resourceId ? 'post' : null,
            payload: mention.payload ? JSON.stringify(mention.payload) : null
        };

        const existing = await this.#MentionModel.findOne({id: data.id}, {require: false});

        if (!existing) {
            await this.#MentionModel.add(data);
        } else {
            await this.#MentionModel.edit(data, {
                id: data.id
            });
        }
        for (const event of mention.events) {
            this.#DomainEvents.dispatch(event);
        }
    }
};
