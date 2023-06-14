const {
    CollectionsService,
    CollectionsRepositoryInMemory
} = require('@tryghost/collections');

class CollectionsServiceWrapper {
    /** @type {CollectionsService} */
    api;

    constructor() {
        const models = require('../../models');
        const events = require('../../lib/common/events');
        const collectionsRepositoryInMemory = new CollectionsRepositoryInMemory();

        const collectionsService = new CollectionsService({
            collectionsRepository: collectionsRepositoryInMemory,
            postsRepository: {
                getAll: async ({filter}) => {
                    const posts = await models.Post.findAll({
                        // @NOTE: enforce "post" type to avoid ever fetching pages
                        filter: `(${filter})+type:post`
                    });

                    return posts.toJSON();
                },
                getBulk: async (ids) => {
                    const posts = await models.Post.findAll({
                        filter: `id:[${ids.join(',')}]+type:post`
                    });

                    return posts.toJSON();
                }
            }
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
