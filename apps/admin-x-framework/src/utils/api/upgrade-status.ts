import { MaintenanceError, VersionMismatchError } from '../errors';

export type UpgradeStatus = 'upgrade-required' | 'maintenance';

type UpgradeStatusListener = (status: UpgradeStatus) => void;

const listeners = new Set<UpgradeStatusListener>();

export function getUpgradeStatus(error: unknown): UpgradeStatus | null {
  if (error instanceof VersionMismatchError) {
    return 'upgrade-required';
  }
  if (error instanceof MaintenanceError) {
    return 'maintenance';
  }
  return null;
}

/** Called for every Ghost API request through `useFetchApi` that fails because Ghost was upgraded or is under maintenance. */
export function onUpgradeStatus(listener: UpgradeStatusListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function reportUpgradeStatus(error: unknown) {
  const status = getUpgradeStatus(error);
  if (status) {
    listeners.forEach((listener) => listener(status));
  }
}
