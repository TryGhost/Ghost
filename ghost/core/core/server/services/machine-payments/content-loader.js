const {isPurchasableEntry} = require('./eligibility');

/**
 * Loads full post/page HTML only after payment has been verified.
 * Bypasses Content API member gating intentionally — this is the privileged
 * unlock path for machine payments, not a membership grant.
 */
class ContentLoader {
    constructor({postModel, urlServiceFacade} = {}) {
        this._postModel = postModel;
        this.urlService = urlServiceFacade;
    }

    get postModel() {
        if (!this._postModel) {
            this._postModel = require('../../models').Post;
        }
        return this._postModel;
    }

    /**
     * @param {'posts'|'pages'} resourceType
     * @param {string} id
     * @returns {Promise<object|null>}
     */
    async loadFullEntry(resourceType, id) {
        const type = resourceType === 'pages' ? 'page' : 'post';
        const model = await this.postModel.findOne({
            id,
            type,
            status: 'published'
        }, {
            withRelated: ['authors', 'tags', 'tiers']
        });

        if (!model) {
            return null;
        }

        const entry = model.toJSON();

        if (!isPurchasableEntry(entry)) {
            return null;
        }

        entry.type = type;

        if (this.urlService) {
            entry.url = this.urlService.getUrlForResource({
                ...entry,
                type: type === 'page' ? 'pages' : 'posts'
            }, {absolute: true});

            if (!entry.url || entry.url.endsWith('/404/')) {
                return null;
            }
        }

        return entry;
    }
}

module.exports = ContentLoader;
