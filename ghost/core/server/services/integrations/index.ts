import { defineService } from '@tryghost/kernel/define-service';
import { alias } from '../../../shared/service-alias';

// Nothing to start. Built the first time the endpoint reads it.
export default alias(
  defineService({
    name: 'Integrations',
    create: () => {
      // The model registry is not something a definition can be handed yet.
      const models = require('../../models');
      const createIntegrationsService = require('./integrations-service');

      return createIntegrationsService({
        IntegrationModel: models.Integration,
        ApiKeyModel: models.ApiKey,
      });
    },
  }),
);
