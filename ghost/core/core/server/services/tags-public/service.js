class TagsPublicServiceWrapper {
    async init() {
        if (this.api) {
            // Already done
            return;
        }

        // Wire up all the dependencies
        const models = require('../../models');
        const adapterManager = require('../adapter-manager');

        const tagsCache = adapterManager.getAdapter('cache:tagsPublic');
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
