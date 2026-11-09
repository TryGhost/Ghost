import logging from '@tryghost/logging';
import { defineService } from '../../../kernel/define-service';
import adapterManager from '../adapter-manager';
import { UpgradeService } from './upgrade-service';

// The adapter is resolved per call, so construction never contacts the host.
export default defineService(
  'Upgrades',
  () =>
    new UpgradeService({
      getAdapter: () => adapterManager.getAdapter('upgrade'),
      logError: (error) => logging.error(error),
    }),
);
