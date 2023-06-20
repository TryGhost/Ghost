const {
    CollectionsService,
    CollectionsRepositoryInMemory,
    CollectionResourceChangeEvent
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

        const events = require('../../lib/common/events');

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

        const ghostModelUpdateEvents = require('./update-events');

        const collectionListener = (event, data) => {
            const change = Object.assign({}, {
                id: data.id,
                resource: event.split('.')[0]
            }, data._changed);
            const collectionResourceChangeEvent = CollectionResourceChangeEvent.create(event, change);
            // @NOTE: to avoid race conditions we need a queue here to make sure updates happen
            //        one by one and not in parallel
            this.api.updateCollections(collectionResourceChangeEvent);
        };

        for (const event of ghostModelUpdateEvents) {
            if (!events.hasRegisteredListener(event, 'collectionListener')) {
                events.on(event, data => collectionListener(event, data));
            }
        }
    }
}

module.exports = new CollectionsServiceWrapper();
