const {BadRequestError} = require('@tryghost/errors');

class PostsService {
    constructor({mega, apiVersion, urlUtils, i18n, models}) {
        this.apiVersion = apiVersion;
        this.mega = mega;
        this.urlUtils = urlUtils;
        this.i18n = i18n;
        this.models = models;
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

module.exports = PostsService;
