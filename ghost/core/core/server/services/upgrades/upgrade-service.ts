import { createHash } from 'node:crypto';
import errors from '@tryghost/errors';
import {
  UpgradeAdapterError,
  acceptedUpgradeJobSchema,
  upgradeDiagnosticsSchema,
  upgradeErrorCodeSchema,
  upgradeJobResultSchema,
  upgradeStatusSchema,
  type UpgradeBase,
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
    Error: errors.DisabledFeatureError,
    code: 'UPGRADE_UNSUPPORTED',
    message: 'Host-managed updates are not supported.',
    context: 'The configured host does not provide an update executor.',
    help: 'Ask your host to configure a supported upgrade adapter.',
  },
  unavailable: {
    Error: errors.MaintenanceError,
    code: 'UPGRADE_UNAVAILABLE',
    message: 'The update service is temporarily unavailable.',
    context: 'Ghost could not reach a usable update service.',
    help: 'Retry later. Reuse the same request key if an update request lost its response.',
  },
  busy: {
    Error: errors.ConflictError,
    code: 'UPGRADE_BUSY',
    message: 'An update is already in progress.',
    context: 'The host is already processing an update.',
    help: 'Poll the active job and wait for it to finish before starting another intent.',
  },
  'target-unapproved': {
    Error: errors.ValidationError,
    code: 'UPGRADE_TARGET_UNAPPROVED',
    message: 'This target is not approved by the host.',
    context: 'The selected release is not in the host-approved target list.',
    help: 'Refresh the available targets before choosing a release.',
  },
  'idempotency-conflict': {
    Error: errors.ConflictError,
    code: 'UPGRADE_IDEMPOTENCY_CONFLICT',
    message: 'This request key was already used for a different target.',
    context: 'A request key can identify only one target for a staff user.',
    help: 'Reuse the original target, or confirm its outcome before starting a new intent with a new key.',
  },
  'request-expired': {
    Error: errors.ConflictError,
    code: 'UPGRADE_REQUEST_EXPIRED',
    message: 'This update request has expired. Confirm its outcome before starting a new request.',
    context: 'The host retains this intent as an expired request.',
    help: 'Confirm the previous outcome before starting a new intent with a new request key.',
  },
  'checks-failed': {
    Error: errors.ValidationError,
    code: 'UPGRADE_CHECKS_FAILED',
    message: 'Update checks must be resolved before continuing.',
    context: 'Host checks have blocked this update.',
    help: 'Resolve the diagnostic findings before retrying the same intent.',
  },
} satisfies Record<
  UpgradeErrorCode,
  {
    Error: typeof errors.MaintenanceError;
    code: string;
    message: string;
    context: string;
    help: string;
  }
>;

/** The host owns durable acceptance and execution; Ghost owns the public boundary. */
export class UpgradeService {
  private readonly getAdapter: () => UpgradeBase;
  private readonly logError: (error: Error) => void;

  constructor(getAdapter: () => UpgradeBase, logError: (error: Error) => void) {
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
          context: rejection.context,
          help: rejection.help,
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
      context: 'Ghost could not obtain a valid result from the host update service.',
      help: 'Retry later. Reuse the same request key if an update request lost its response.',
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
