import logging from '@tryghost/logging';
import { defineService } from '../../../../bootstrap/transition/define-service';
import { TierRequirements } from './requirements';

// Publishes the API and the cached tiers behind it together. The repository loads the tiers the
// first time one is read or saved, so building this reads nothing. Test fixtures reload the
// repository after inserting products. Boot sets up the custom fields services first, as tier
// requirements read which ports are bound to a custom field, and which field each names.
export default defineService('Tiers', () => {
  const DomainEvents = require('@tryghost/domain-events');
  const { knex } = require('../../data/db');
  const models = require('../../models');
  const metafields: typeof import('../members-metafields') = require('../members-metafields');
  const TierRepository = require('./tier-repository');
  const TiersAPI = require('./tiers-api');

  const { bindings } = metafields.booted();
  // Requirements are read fresh on every tier read that asks for them, while the tiers
  // themselves stay cached.
  const requirements = new TierRequirements({
    knex,
    boundPorts: (ports, executor) => bindings.boundPorts(ports, executor),
    logging,
  });

  const repository = new TierRepository({
    ProductModel: models.Product,
    DomainEvents,
    requirements,
  });

  const slugService = {
    async generate(input: string) {
      return models.Product.generateSlug(models.Product, input, {});
    },
  };

  const api = new TiersAPI({
    repository,
    slugService,
  });

  return { api, repository, requirements };
});
