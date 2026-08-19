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

        // What a tier's checkout asks, kept beside the tier rather than inside it: these
        // rows are read live on every request, because deleting a custom field cascades a
        // question away without the repository above ever seeing it, and a cached copy
        // would go on naming a field the site no longer has.
        //
        // Boot builds the custom fields services before this one, so both collaborators
        // are ready by the time this runs.
        const {TierCheckoutConfigService} = require('../tier-checkout-config');
        this.checkout = new TierCheckoutConfigService({knex: models.Base.knex});
    }
}

module.exports = new TiersServiceWrapper();
