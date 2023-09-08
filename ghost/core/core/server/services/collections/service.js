const {
    CollectionsService
} = require('@tryghost/collections');
const BookshelfCollectionsRepository = require('./BookshelfCollectionsRepository');

function getEnabled(config, labs) {
    if (config.get('hostSettings:collections:enabled') === false) {
        return false;
    }

    return labs.isSet('collections');
}

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
        const config = require('../../../shared/config');
        const labs = require('../../../shared/labs');

        const enabled = getEnabled(config, labs);
        // If labs isn't set then we don't run collections
        if (!enabled) {
            return;
        }

        if (inited) {
            return;
        }
        inited = true;
        this.api.subscribeToEvents();
    }
}

module.exports = new CollectionsServiceWrapper();
