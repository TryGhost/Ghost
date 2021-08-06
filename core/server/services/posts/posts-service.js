const {BadRequestError} = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const messages = {
    invalidEmailRecipientFilter: 'Invalid filter in email_recipient_filter param.'
};

class PostsService {
    constructor({mega, apiVersion, urlUtils, models, isSet}) {
        this.apiVersion = apiVersion;
        this.mega = mega;
        this.urlUtils = urlUtils;
        this.models = models;
        this.isSet = isSet;
    }

    async editPost(frame) {
        let model;

        if (!frame.options.email_recipient_filter && frame.options.send_email_when_published) {
            await this.models.Base.transaction(async (transacting) => {
                const options = {
                    ...frame.options,
                    transacting
                };

                /**
                 * 1. We need to edit the post first in order to know what the visibility is.
                 * 2. We can only pass the email_recipient_filter when we change the status.
                 *
                 * So, we first edit the post as requested, with all information except the status,
                 * from there we can determine what the email_recipient_filter should be and then finish
                 * the edit, with the status and the email_recipient_filter option.
                 */
                const status = frame.data.posts[0].status;
                delete frame.data.posts[0].status;
                const interimModel = await this.models.Post.edit(frame.data.posts[0], options);
                frame.data.posts[0].status = status;

                options.email_recipient_filter = interimModel.get('visibility') === 'paid' ? 'paid' : 'all';

                model = await this.models.Post.edit(frame.data.posts[0], options);
            });
        } else {
            model = await this.models.Post.edit(frame.data.posts[0], frame.options);
        }

        /**Handle newsletter email */
        const emailRecipientFilter = model.get('email_recipient_filter');
        if (emailRecipientFilter !== 'none') {
            if (emailRecipientFilter !== 'all') {
                // check filter is valid
                try {
                    await this.models.Member.findPage({filter: `subscribed:true+${emailRecipientFilter}`, limit: 1});
                } catch (err) {
                    return Promise.reject(new BadRequestError({
                        message: tpl(messages.invalidEmailRecipientFilter),
                        context: err.message
                    }));
                }
            }

            const postPublished = model.wasChanged() && (model.get('status') === 'published') && (model.previous('status') !== 'published');
            const emailOnlyEnabled = model.related('posts_meta').get('email_only') && this.isSet('emailOnlyPosts');

            if (postPublished || emailOnlyEnabled) {
                let postEmail = model.relations.email;

                if (!postEmail) {
                    const email = await this.mega.addEmail(model, Object.assign({}, frame.options, {apiVersion: this.apiVersion}));
                    model.set('email', email);
                } else if (postEmail && postEmail.get('status') === 'failed') {
                    const email = await this.mega.retryFailedEmail(postEmail);
                    model.set('email', email);
                }
            }
        }

        return model;
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
 * @param {string} apiVersion - API version to use within the service
 * @returns {PostsService} instance of the PostsService
 */
const getPostServiceInstance = (apiVersion) => {
    const urlUtils = require('../../../shared/url-utils');
    const {mega} = require('../mega');
    const labs = require('../../../shared/labs');
    const models = require('../../models');

    return new PostsService({
        apiVersion: apiVersion,
        mega: mega,
        urlUtils: urlUtils,
        models: models,
        isSet: labs.isSet.bind(labs)
    });
};

module.exports = getPostServiceInstance;
