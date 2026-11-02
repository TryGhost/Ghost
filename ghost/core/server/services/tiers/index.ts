import { defineService } from '../../../kernel/define-service';

// Publishes the API and the cached tiers behind it together, once the tiers have loaded.
// Test fixtures reload the repository after inserting products.
export default defineService('Tiers', async () => {
  const DomainEvents = require('@tryghost/domain-events');
  const models = require('../../models');
  const TierRepository = require('./tier-repository');
  const TiersAPI = require('./tiers-api');

  const repository = new TierRepository({
    ProductModel: models.Product,
    DomainEvents,
  });

  const slugService = {
    async generate(input: string) {
      return models.Product.generateSlug(models.Product, input, {});
    },
  };

  await repository.init();

  const api = new TiersAPI({
    repository,
    slugService,
  });

  return { api, repository };
});
