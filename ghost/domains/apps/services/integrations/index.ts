import { defineService } from '#support/define-service';
import { Models } from '../../../../shared/transition/legacy';
import type { IntegrationsService } from './integrations.service';

export const Integrations = defineService({
  name: 'apps/integrations',
  lifetime: 'site',
  needs: { models: Models },
  create: ({ models }): IntegrationsService => {
    const implementation: typeof import('./integrations.service') = require('./integrations.service');
    return new implementation.IntegrationsService({
      IntegrationModel: models.Integration,
      ApiKeyModel: models.ApiKey,
    });
  },
});
