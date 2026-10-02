import type {
  CreateUpgradeRequest,
  AcceptedUpgradeJob,
  UpgradeJobResult,
  UpgradeStatus,
} from './schemas.ts';

/** Host-managed upgrades. Construction must not perform I/O or require a host connection. */
export abstract class UpgradeBase {
  declare readonly requiredFns: readonly ['getStatus', 'createRequest', 'getJob'];

  constructor(_config: object = {}) {
    Object.defineProperty(this, 'requiredFns', {
      value: Object.freeze(['getStatus', 'createRequest', 'getJob']),
      writable: false,
    });
  }

  abstract getStatus(): Promise<UpgradeStatus>;

  /**
   * Atomically and durably accept an intent or replay its existing job before
   * checking availability/policy. Reusing a key for another target must reject.
   * The host generates job IDs and retains expired keys as non-executable tombstones.
   */
  abstract createRequest(request: CreateUpgradeRequest): Promise<AcceptedUpgradeJob>;

  /** Unknown/expired records are distinct from temporary failures during restart. */
  abstract getJob(id: string): Promise<UpgradeJobResult>;
}
