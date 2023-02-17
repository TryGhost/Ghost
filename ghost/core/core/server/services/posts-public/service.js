class PostsPublicServiceWrapper {
    async init() {
        if (this.api) {
            // Already done
            return;
        }

        // Wire up all the dependencies
        const {Post} = require('../../models');
        const adapterManager = require('../adapter-manager');
        const config = require('../../../shared/config');

        let postsCache;
        if (config.get('hostSettings:postsPublicCache:enabled')) {
            postsCache = adapterManager.getAdapter('cache:postsPublic');
        }

        const {PublicResourcesRepository} = require('@tryghost/public-resource-repository');

        this.postsRepository = new PublicResourcesRepository({
            Model: Post,
            cache: postsCache
        });

        this.api = {
            browse: this.postsRepository.getAll.bind(this.postsRepository)
        };
    }
}

module.exports = new PostsPublicServiceWrapper();
