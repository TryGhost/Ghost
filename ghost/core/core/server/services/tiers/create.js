const TiersAPI = require('./tiers-api');
const TierRepository = require('./tier-repository');

/**
 * @param {object} deps
 * @param {object} deps.models
 * @param {object} deps.domainEvents
 */
module.exports = function createTiersService({models, domainEvents}) {
    const repository = new TierRepository({
        ProductModel: models.Product,
        DomainEvents: domainEvents
    });

    const slugService = {
        async generate(input) {
            return models.Product.generateSlug(models.Product, input, {});
        }
    };

    const api = new TiersAPI({
        repository,
        slugService
    });

    let initialized = false;

    return {
        api,
        repository,
        async init() {
            if (initialized) {
                return;
            }
            initialized = true;
            await repository.init();
        }
    };
};
