import { defineService } from '@tryghost/kernel/define-service';

export default defineService('Integrations', () => {
  const models = require('../../models');
  const createIntegrationsService = require('./integrations-service');

  return createIntegrationsService({
    IntegrationModel: models.Integration,
    ApiKeyModel: models.ApiKey,
  });
});
