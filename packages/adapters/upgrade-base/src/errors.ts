import type { UpgradeDiagnostic } from './diagnostics.ts';
import type { UpgradeErrorCode } from './schemas.ts';

/** Expected adapter rejection. The code and diagnostics are the only public data. */
export class UpgradeAdapterError extends Error {
  readonly code: UpgradeErrorCode;
  readonly diagnostics?: UpgradeDiagnostic[];

  constructor({
    code,
    diagnostics,
  }: {
    code: UpgradeErrorCode;
    diagnostics?: UpgradeDiagnostic[];
  }) {
    super(code);
    this.name = 'UpgradeAdapterError';
    this.code = code;
    this.diagnostics = diagnostics;
  }
}
