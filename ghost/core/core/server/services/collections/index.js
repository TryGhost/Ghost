const {CollectionsService, CollectionsRepositoryInMemory} = require('@tryghost/collections');

class CollectionsServiceWrapper {
    api;

    constructor() {
        const inMemoryCollectionsRepository = new CollectionsRepositoryInMemory();
        const collectionsService = new CollectionsService({
            repository: inMemoryCollectionsRepository
        });

        this.api = {
            browse: collectionsService.getAll.bind(collectionsService),
            add: collectionsService.save.bind(collectionsService)
        };
    }
}

module.exports = new CollectionsServiceWrapper();
