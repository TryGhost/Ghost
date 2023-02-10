class TagsPublicServiceWrapper {
    async init() {
        if (this.api) {
            // Already done
            return;
        }

        // Wire up all the dependencies
        const models = require('../../models');
        const adapterManager = require('../adapter-manager');
        const config = require('../../../shared/config');

        let tagsCache;
        if (config.get('hostSettings:tagsPublicCache:enabled')) {
            tagsCache = adapterManager.getAdapter('cache:tagsPublic');
        }

        const {TagsPublicRepository} = require('@tryghost/tags-public');

        this.linkRedirectRepository = new TagsPublicRepository({
            Tag: models.TagPublic,
            cache: tagsCache
        });

        this.api = {
            browse: this.linkRedirectRepository.getAll.bind(this.linkRedirectRepository)
        };
    }
}

module.exports = new TagsPublicServiceWrapper();
