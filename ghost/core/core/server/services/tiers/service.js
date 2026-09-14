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
      DomainEvents,
    });

    const slugService = {
      async generate(input) {
        return models.Product.generateSlug(models.Product, input, {});
      },
    };

    await repository.init();

    this.repository = repository;

    this.api = new TiersAPI({
      repository,
      slugService,
    });

    // What a tier's checkout asks, kept beside the tier rather than inside it: these
    // rows are read live on every request, because deleting a metafield cascades a
    // question away without the repository above ever seeing it, and a cached copy
    // would go on naming a field the site no longer has.
    //
    // Boot builds the metafields services before this one, so both collaborators
    // are ready by the time this runs.
    const { TierCheckoutConfigService } = require('../tier-checkout-config');
    const { bindings, definitions } = require('../members-metafields');
    this.checkout = new TierCheckoutConfigService({
      knex: models.Base.knex,
      // A binding is where a collected value lands, and the same rows are what a completed
      // checkout is routed through later. Handed over rather than reached for, so the
      // checkout domain states what it needs of them and nothing more.
      bindings,
      // Turning a collection on has to leave it somewhere to land, and making a field is
      // the definitions' to do. A separate collaborator because it is a separate act, and
      // because deciding whether one is needed belongs to the checkout rather than to them.
      fields: definitions,
    });
  }
}

module.exports = new TiersServiceWrapper();
