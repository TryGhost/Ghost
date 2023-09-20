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
        const collectionsRepositoryInMemory = new BookshelfCollectionsRepository(models.Collection, models.CollectionPost);

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
        const config = require('../../../shared/config');
        const labs = require('../../../shared/labs');

        // host setting OR labs "collections" flag has to be enabled to run collections service
        if (config.get('hostSettings:collections:enabled') || labs.isSet('collections')) {
            if (inited) {
                return;
            }

            inited = true;
            this.api.subscribeToEvents();
        }
    }
}

module.exports = new CollectionsServiceWrapper();
