import { createHash } from 'node:crypto';
import errors from '@tryghost/errors';
import {
  UpgradeAdapterError,
  acceptedUpgradeJobSchema,
  upgradeDiagnosticsSchema,
  upgradeErrorCodeSchema,
  upgradeJobResultSchema,
  upgradeStatusSchema,
  type UpgradeAdapter,
  type UpgradeErrorCode,
} from '@tryghost/adapter-base-upgrade';

/** Request inputs have already been validated by the caller's API boundary. */
export interface UpgradeRequestInput {
  targetVersion: string;
  /** Client-generated UUID v4; the service scopes it to the authenticated staff user. */
  idempotencyKey: string;
}

const rejections = {
  unsupported: {
    Error: errors.NoPermissionError,
    code: 'UPGRADE_UNSUPPORTED',
    message: 'Host-managed updates are not supported.',
  },
  unavailable: {
    Error: errors.MaintenanceError,
    code: 'UPGRADE_UNAVAILABLE',
    message: 'The update service is temporarily unavailable.',
  },
  busy: {
    Error: errors.ConflictError,
    code: 'UPGRADE_BUSY',
    message: 'An update is already in progress.',
  },
  'target-unapproved': {
    Error: errors.ValidationError,
    code: 'UPGRADE_TARGET_UNAPPROVED',
    message: 'This target is not approved by the host.',
  },
  'idempotency-conflict': {
    Error: errors.ConflictError,
    code: 'UPGRADE_IDEMPOTENCY_CONFLICT',
    message: 'This request key was already used for a different target.',
  },
  'request-expired': {
    Error: errors.ConflictError,
    code: 'UPGRADE_REQUEST_EXPIRED',
    message: 'This update request has expired. Confirm its outcome before starting a new request.',
  },
  'checks-failed': {
    Error: errors.ValidationError,
    code: 'UPGRADE_CHECKS_FAILED',
    message: 'Update checks must be resolved before continuing.',
  },
} satisfies Record<
  UpgradeErrorCode,
  { Error: typeof errors.MaintenanceError; code: string; message: string }
>;

/** The host owns durable acceptance and execution; Ghost owns the public boundary. */
export class UpgradeService {
  private readonly getAdapter: () => UpgradeAdapter;
  private readonly logError: (error: Error) => void;

  constructor(getAdapter: () => UpgradeAdapter, logError: (error: Error) => void) {
    this.getAdapter = getAdapter;
    this.logError = logError;
  }

  private adapterFailure(error: unknown, operation: string): never {
    if (error instanceof UpgradeAdapterError) {
      const parsed = upgradeErrorCodeSchema.safeParse(error.code);
      const diagnostics = upgradeDiagnosticsSchema.optional().safeParse(error.diagnostics);
      if (parsed.success && diagnostics.success) {
        const rejection = rejections[parsed.data];
        throw new rejection.Error({
          message: rejection.message,
          code: rejection.code,
          ...(diagnostics.data && { errorDetails: { diagnostics: diagnostics.data } }),
        });
      }
    }
    // Log the original error locally; never serialize its message/stack or output.
    this.logError(
      new errors.InternalServerError({
        message: 'The update adapter failed.',
        context: `Update adapter operation: ${operation}.`,
        err:
          error instanceof Error
            ? error
            : new errors.IncorrectUsageError({ message: 'Adapter threw a non-Error value.' }),
      }),
    );
    throw new errors.MaintenanceError({
      message: 'The update service is temporarily unavailable.',
      code: 'UPGRADE_UNAVAILABLE',
    });
  }

  async getStatus() {
    try {
      return upgradeStatusSchema.parse(await this.getAdapter().getStatus());
    } catch (error) {
      return this.adapterFailure(error, 'getStatus');
    }
  }

  async createRequest(input: UpgradeRequestInput, userId: string) {
    const idempotencyKey = createHash('sha256')
      .update(JSON.stringify([userId, input.idempotencyKey]))
      .digest('hex');
    try {
      const job = acceptedUpgradeJobSchema.parse(
        await this.getAdapter().createRequest({
          targetVersion: input.targetVersion,
          idempotencyKey,
        }),
      );
      if (job.targetVersion !== input.targetVersion) {
        throw new errors.IncorrectUsageError({
          message: 'Accepted job target does not match the requested target.',
        });
      }
      return job;
    } catch (error) {
      return this.adapterFailure(error, 'createRequest');
    }
  }

  async getJob(id: string) {
    try {
      const job = upgradeJobResultSchema.parse(await this.getAdapter().getJob(id));
      if (job.id !== id) {
        throw new errors.IncorrectUsageError({ message: 'Lookup returned a different job ID.' });
      }
      return job;
    } catch (error) {
      return this.adapterFailure(error, 'getJob');
    }
  }
}
