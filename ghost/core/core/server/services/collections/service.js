const {
    CollectionsService
} = require('@tryghost/collections');
const BookshelfCollectionsRepository = require('./BookshelfCollectionsRepository');
const labs = require('../../../shared/labs');

class CollectionsServiceWrapper {
    /** @type {CollectionsService} */
    api;

    constructor() {
        const DomainEvents = require('@tryghost/domain-events');
        const postsRepository = require('./PostsRepository').getInstance();
        const models = require('../../models');
        const collectionsRepositoryInMemory = new BookshelfCollectionsRepository(models.Collection);

        const collectionsService = new CollectionsService({
            collectionsRepository: collectionsRepositoryInMemory,
            postsRepository: postsRepository,
            DomainEvents: DomainEvents,
            slugService: {
                async generate(input) {
                    return models.Collection.generateSlug(models.Collection, input, {});
                }
            }
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

        this.api.subscribeToEvents();
        require('./intercept-events')();
    }
}

module.exports = new CollectionsServiceWrapper();
