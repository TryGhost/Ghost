import {
  UpgradeBase,
  UpgradeAdapterError,
  type UpgradeJob,
  type UpgradeJobResult,
  type UpgradeStatus,
} from '@tryghost/adapter-base-upgrade';

/** The default: Ghost never upgrades itself, so updates stay unavailable until a host adapter is configured. */
export default class NoopUpgradeAdapter extends UpgradeBase {
  async getStatus(): Promise<UpgradeStatus> {
    return { supported: false, reason: 'not-configured' };
  }

  async createRequest(): Promise<UpgradeJob> {
    throw new UpgradeAdapterError({ code: 'unsupported' });
  }

  async getJob(id: string): Promise<UpgradeJobResult> {
    return { id, state: 'unknown' };
  }
}
