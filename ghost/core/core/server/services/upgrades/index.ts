import logging from '@tryghost/logging';
import adapterManager from '../adapter-manager';
import { UpgradeService } from './upgrade-service';

export const upgradeService = new UpgradeService(
  () => adapterManager.getAdapter('upgrade'),
  (error) => logging.error(error),
);
