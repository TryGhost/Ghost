const {
    CollectionsService,
    CollectionsRepositoryInMemory
} = require('@tryghost/collections');

class CollectionsServiceWrapper {
    api;

    constructor() {
        const collectionsRepositoryInMemory = new CollectionsRepositoryInMemory();

        const collectionsService = new CollectionsService({
            collectionsRepository: collectionsRepositoryInMemory
        });

        this.api = {
            browse: collectionsService.getAll.bind(collectionsService),
            read: collectionsService.getById.bind(collectionsService),
            add: collectionsService.createCollection.bind(collectionsService),
            edit: collectionsService.edit.bind(collectionsService),
            addPost: collectionsService.addPostToCollection.bind(collectionsService),
            destroy: collectionsService.destroy.bind(collectionsService),
            destroyCollectionPost: collectionsService.removePostFromCollection.bind(collectionsService)
        };
    }
}

module.exports = new CollectionsServiceWrapper();
