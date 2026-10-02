import logging from '@tryghost/logging';
import adapterManager from '../adapter-manager';
import { UpgradeService } from './upgrade-service';

export let upgradeService: UpgradeService | undefined;

/** Boot constructs the service after initializing the adapter manager. */
export function init(): void {
  if (upgradeService) {
    return;
  }

  upgradeService = new UpgradeService(
    () => adapterManager.getAdapter('upgrade'),
    (error) => logging.error(error),
  );
}
