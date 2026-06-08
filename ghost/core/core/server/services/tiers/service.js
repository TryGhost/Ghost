class TiersServiceWrapper {
    async init() {
        if (this.api) {
            // Already done
            return;
        }

        const TiersAPI = require('./tiers-api');
        const DomainEvents = require('@tryghost/domain-events');

        const models = require('../../models');
        const TierRepository = require('./tier-repository');

        const repository = new TierRepository({
            ProductModel: models.Product,
            DomainEvents
        });

        const slugService = {
            async generate(input) {
                return models.Product.generateSlug(models.Product, input, {});
            }
        };

        await repository.init();

        this.repository = repository;

        this.api = new TiersAPI({
            repository,
            slugService
        });
    }
}

module.exports = new TiersServiceWrapper();
