const {
    CollectionsService,
    CollectionsRepositoryInMemory
} = require('@tryghost/collections');

class CollectionsServiceWrapper {
    /** @type {CollectionsService} */
    api;

    constructor() {
        const postsRepository = require('./PostsRepository').getInstance();
        const events = require('../../lib/common/events');
        const collectionsRepositoryInMemory = new CollectionsRepositoryInMemory();

        const collectionsService = new CollectionsService({
            collectionsRepository: collectionsRepositoryInMemory,
            postsRepository: postsRepository
        });

        // @NOTE: these should be reworked to use the "Event" classes
        //        instead of Bookshelf model events
        const updateEvents = require('./update-events');

        // @NOTE: naive update implementation to keep things simple for the first version
        for (const event of updateEvents) {
            events.on(event, () => {
                collectionsService.updateAutomaticCollections();
            });
        }

        this.api = collectionsService;
    }

    async init() {
        const existingBuiltins = await this.api.getAll({filter: 'slug:featured'});

        if (!existingBuiltins.data.length) {
            const builtInCollections = require('./built-in-collections');

            for (const collection of builtInCollections) {
                await this.api.createCollection(collection);
            }
        }
    }
}

module.exports = new CollectionsServiceWrapper();
