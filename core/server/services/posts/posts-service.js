const nql = require('@tryghost/nql');
const {BadRequestError} = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const messages = {
    invalidVisibilityFilter: 'Invalid visibility filter.',
    invalidEmailSegment: 'The email segment parameter doesn\'t contain a valid filter'
};

class PostsService {
    constructor({mega, urlUtils, models, isSet}) {
        this.mega = mega;
        this.urlUtils = urlUtils;
        this.models = models;
        this.isSet = isSet;
    }

    async editPost(frame) {
        // Make sure the newsletter is matching an active newsletter
        // Note that this option is simply ignored if the post isn't published or scheduled
        if (frame.options.newsletter && frame.options.email_segment) {
            if (frame.options.email_segment !== 'all') {
                // check filter is valid
                try {
                    await this.models.Member.findPage({filter: frame.options.email_segment, limit: 1});
                } catch (err) {
                    return Promise.reject(new BadRequestError({
                        message: tpl(messages.invalidEmailSegment),
                        context: err.message
                    }));
                }
            }
        }

        const model = await this.models.Post.edit(frame.data.posts[0], frame.options);

        /**Handle newsletter email */
        if (model.get('newsletter_id')) {
            const sendEmail = model.wasChanged() && this.shouldSendEmail(model.get('status'), model.previous('status'));

            if (sendEmail) {
                let postEmail = model.relations.email;

                if (!postEmail) {
                    const email = await this.mega.addEmail(model, frame.options);
                    model.set('email', email);
                } else if (postEmail && postEmail.get('status') === 'failed') {
                    const email = await this.mega.retryFailedEmail(postEmail);
                    model.set('email', email);
                }
            }
        }

        return model;
    }

    async getProductsFromVisibilityFilter(visibilityFilter) {
        try {
            const allProducts = await this.models.Product.findAll();
            const visibilityFilterJson = nql(visibilityFilter).toJSON();
            const productsData = (visibilityFilterJson.product ? [visibilityFilterJson] : visibilityFilterJson.$or) || [];
            const tiers = productsData
                .map((data) => {
                    return allProducts.find((p) => {
                        return p.get('slug') === data.product;
                    });
                }).filter(p => !!p).map((d) => {
                    return d.toJSON();
                });
            return tiers;
        } catch (err) {
            return Promise.reject(new BadRequestError({
                message: tpl(messages.invalidVisibilityFilter),
                context: err.message
            }));
        }
    }

    /**
     * Calculates if the email should be tried to be sent out
     * @private
     * @param {String} currentStatus current status from the post model
     * @param {String} previousStatus previous status from the post model
     * @returns {Boolean}
     */
    shouldSendEmail(currentStatus, previousStatus) {
        return (['published', 'sent'].includes(currentStatus))
            && (!['published', 'sent'].includes(previousStatus));
    }

    handleCacheInvalidation(model) {
        let cacheInvalidate;

        if (
            model.get('status') === 'published' && model.wasChanged() ||
            model.get('status') === 'draft' && model.previous('status') === 'published'
        ) {
            cacheInvalidate = true;
        } else if (
            model.get('status') === 'draft' && model.previous('status') !== 'published' ||
            model.get('status') === 'scheduled' && model.wasChanged()
        ) {
            cacheInvalidate = {
                value: this.urlUtils.urlFor({
                    relativeUrl: this.urlUtils.urlJoin('/p', model.get('uuid'), '/')
                })
            };
        } else {
            cacheInvalidate = false;
        }

        return cacheInvalidate;
    }
}

/**
 * @returns {PostsService} instance of the PostsService
 */
const getPostServiceInstance = () => {
    const urlUtils = require('../../../shared/url-utils');
    const {mega} = require('../mega');
    const labs = require('../../../shared/labs');
    const models = require('../../models');

    return new PostsService({
        mega: mega,
        urlUtils: urlUtils,
        models: models,
        isSet: labs.isSet.bind(labs)
    });
};

module.exports = getPostServiceInstance;
// exposed for testing purposes only
module.exports.PostsService = PostsService;
