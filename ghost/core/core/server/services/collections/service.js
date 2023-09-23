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
        const collectionsRepositoryInMemory = new BookshelfCollectionsRepository(models.Collection, models.CollectionPost, DomainEvents);

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

        // CASE: emergency kill switch in case we need to disable collections outside of labs
        if (config.get('hostSettings:collections:enabled') === false) {
            return;
        }

        if (labs.isSet('collections')) {
            if (inited) {
                return;
            }

            inited = true;
            this.api.subscribeToEvents();
        }
    }
}

module.exports = new CollectionsServiceWrapper();
