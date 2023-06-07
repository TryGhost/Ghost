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
                    return models.Post.findAll({
                        // @NOTE: enforce "post" type to avoid ever fetching pages
                        filter: `(${filter})+type:post`
                    });
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
        const featuredCollections = await this.api.getAll({filter: 'slug:featured'});

        if (!featuredCollections.data.length) {
            this.api.createCollection({
                title: 'Featured Posts',
                slug: 'featured',
                description: 'Collection of featured posts',
                type: 'automatic',
                filter: 'featured:true'
            });
        }
    }
}

module.exports = new CollectionsServiceWrapper();
