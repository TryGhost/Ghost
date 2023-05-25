const models = require('../../models');
const {
    CollectionsService,
    CollectionsRepositoryInMemory,
    PostsDataRepositoryBookshelf
} = require('@tryghost/collections');

class CollectionsServiceWrapper {
    api;

    constructor() {
        const collectionsRepositoryInMemory = new CollectionsRepositoryInMemory();
        const postsDataRepositoryBookshelf = new PostsDataRepositoryBookshelf({
            Post: models.Post
        });

        const collectionsService = new CollectionsService({
            collectionsRepository: collectionsRepositoryInMemory,
            postsRepository: postsDataRepositoryBookshelf
        });

        this.api = {
            browse: collectionsService.getAll.bind(collectionsService),
            read: collectionsService.getById.bind(collectionsService),
            add: collectionsService.save.bind(collectionsService),
            edit: collectionsService.edit.bind(collectionsService),
            destroy: collectionsService.destroy.bind(collectionsService)
        };
    }
}

module.exports = new CollectionsServiceWrapper();
