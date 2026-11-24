import { defineService } from '#support/define-service';
import { Integrations } from '../services/integrations';
import type { EditIntegrationOptions } from '../services/integrations/integrations.service';

/** Edits an integration, or refreshes the secret of one of its API keys when `options.keyid` is set. */
export const EditIntegration = defineService({
  name: 'apps/edit-integration',
  lifetime: 'site',
  needs: { integrations: Integrations },
  create:
    ({ integrations }) =>
    (data: unknown, options: EditIntegrationOptions) =>
      integrations.edit(data, options),
});
