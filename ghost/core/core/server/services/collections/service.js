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
        const DomainEvents = require('@tryghost/domain-events');

        const collectionsService = new CollectionsService({
            collectionsRepository: collectionsRepositoryInMemory,
            postsRepository: postsRepository,
            DomainEvents: DomainEvents,
            slugService: {
                async generate(input) {
                    return input.toLowerCase().trim().replace(/^[^a-z0-9A-Z_]+/, '').replace(/[^a-z0-9A-Z_]+$/, '').replace(/[^a-z0-9A-Z_]+/g, '-');
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
