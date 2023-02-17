class TagsPublicServiceWrapper {
    async init() {
        if (this.api) {
            // Already done
            return;
        }

        // Wire up all the dependencies
        const {TagPublic} = require('../../models');
        const adapterManager = require('../adapter-manager');
        const config = require('../../../shared/config');

        let tagsCache;
        if (config.get('hostSettings:tagsPublicCache:enabled')) {
            tagsCache = adapterManager.getAdapter('cache:tagsPublic');
        }

        const {PublicResourcesRepository} = require('@tryghost/public-resource-repository');

        this.tagsPublicRepository = new PublicResourcesRepository({
            Model: TagPublic,
            cache: tagsCache
        });

        this.api = {
            browse: this.tagsPublicRepository.getAll.bind(this.tagsPublicRepository)
        };
    }
}

module.exports = new TagsPublicServiceWrapper();
