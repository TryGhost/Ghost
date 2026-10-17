import type {
  CreateUpgradeRequest,
  UpgradeJob,
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
   * Durably accept an intent, or return the job an earlier call with the same key
   * created, before checking availability or policy. Reusing a key for another
   * target must reject with `idempotency-conflict`. The host generates job IDs.
   */
  abstract createRequest(request: CreateUpgradeRequest): Promise<UpgradeJob>;

  /** Resolves `unknown`/`expired` for absent records; throws only for temporary failures. */
  abstract getJob(id: string): Promise<UpgradeJobResult>;
}
