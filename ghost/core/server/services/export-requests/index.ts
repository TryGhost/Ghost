import { defineService } from '#support/define-service';
import { Config, Logging } from '../../../../shared/transition/legacy';
import type { ExportRequestsService } from './export-requests-service';

export const ExportRequests = defineService({
  name: 'export-requests',
  lifetime: 'site',
  needs: { config: Config, logging: Logging },
  create: (needs): ExportRequestsService => {
    const implementation: typeof import('./export-requests-service') = require('./export-requests-service');
    // The request library holds no state, so it is imported and not named in needs.
    return new implementation.ExportRequestsService({
      ...needs,
      request: require('@tryghost/request'),
    });
  },
});
