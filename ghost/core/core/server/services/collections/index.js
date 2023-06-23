const {
    CollectionsService,
    CollectionsRepositoryInMemory
} = require('@tryghost/collections');
const labs = require('../../../shared/labs');

class CollectionsServiceWrapper {
    /** @type {CollectionsService} */
    api;

    constructor() {
        const postsRepository = require('./PostsRepository').getInstance();
        const collectionsRepositoryInMemory = new CollectionsRepositoryInMemory();

        const collectionsService = new CollectionsService({
            collectionsRepository: collectionsRepositoryInMemory,
            postsRepository: postsRepository
        });

        this.api = collectionsService;
    }

    async init() {
        if (!labs.isSet('collections')) {
            return;
        }
        const existingBuiltins = await this.api.getAll({filter: 'slug:featured'});

        if (!existingBuiltins.data.length) {
            await this.api.createCollection({
                title: 'Index',
                slug: 'index',
                description: 'Collection with all posts',
                type: 'automatic',
                deletable: false,
                filter: 'status:published'
            });

            await this.api.createCollection({
                title: 'Featured Posts',
                slug: 'featured',
                description: 'Collection of featured posts',
                type: 'automatic',
                deletable: false,
                filter: 'featured:true'
            });
        }

        const events = require('../../lib/common/events');
        // @NOTE: these should be reworked to use the "Event" classes
        //        instead of Bookshelf model events
        const updateEvents = require('./update-events');

        // @NOTE: naive update implementation to keep things simple for the first version
        for (const event of updateEvents) {
            events.on(event, () => {
                this.api.updateAutomaticCollections();
            });
        }
    }
}

module.exports = new CollectionsServiceWrapper();
