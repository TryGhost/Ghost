import logging from '@tryghost/logging';
import { defineService } from '../../../kernel/define-service';
import { TierRequirements } from './requirements';

// Publishes the API and the cached tiers behind it together, once the tiers have loaded.
// Test fixtures reload the repository after inserting products. Boot sets up the custom fields
// services first, as tier requirements read which ports are bound to a custom field, and which
// field each names. It sets up invalidations earlier still, so a change another instance makes
// while the tiers load reloads them once they have.
export default defineService('Tiers', async () => {
  const DomainEvents = require('@tryghost/domain-events');
  const { knex } = require('../../data/db');
  const models = require('../../models');
  const metafields: typeof import('../members-metafields') = require('../members-metafields');
  const invalidations: typeof import('../invalidations') = require('../invalidations');
  const TierRepository = require('./tier-repository');
  const TiersAPI = require('./tiers-api');

  const { bindings } = metafields.booted();
  // Requirements are read fresh on every tier read that asks for them, while the tiers
  // themselves stay cached.
  const requirements = new TierRequirements({
    knex,
    // Tiers list a requirement's fields to anyone, so a port names its field as a member reads it.
    boundPorts: (ports, executor) => bindings.boundPorts(ports, { kind: 'member' }, executor),
    logging,
  });

  const repository = new TierRepository({
    ProductModel: models.Product,
    DomainEvents,
    requirements,
    invalidations: invalidations.default.service,
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

  return { api, repository, requirements };
});
