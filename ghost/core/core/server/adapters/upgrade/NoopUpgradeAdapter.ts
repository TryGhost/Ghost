import {
  UpgradeAdapter,
  UpgradeAdapterError,
  type UpgradeStatus,
  type UpgradeJobResult,
  type AcceptedUpgradeJob,
  type CreateUpgradeRequest,
} from '@tryghost/adapter-base-upgrade';

export default class NoopUpgradeAdapter extends UpgradeAdapter {
  async getStatus(): Promise<UpgradeStatus> {
    return { supported: false, reason: 'not-configured' };
  }

  async createRequest(_request: CreateUpgradeRequest): Promise<AcceptedUpgradeJob> {
    throw new UpgradeAdapterError({ code: 'unsupported' });
  }

  async getJob(id: string): Promise<UpgradeJobResult> {
    return { id, state: 'unknown' };
  }
}
