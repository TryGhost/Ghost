const {
    CollectionsService
} = require('@tryghost/collections');
const BookshelfCollectionsRepository = require('./BookshelfCollectionsRepository');

let inited = false;
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
                async generate(input, options) {
                    return models.Collection.generateSlug(models.Collection, input, {
                        transacting: options.transaction
                    });
                }
            }
        });

        this.api = collectionsService;
    }

    async init() {
        if (inited) {
            return;
        }
        inited = true;
        this.api.subscribeToEvents();
        require('./intercept-events')();
    }
}

module.exports = new CollectionsServiceWrapper();
