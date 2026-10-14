import { createHash } from 'node:crypto';
import errors from '@tryghost/errors';
import {
  UpgradeAdapterError,
  upgradeDiagnosticsSchema,
  upgradeErrorCodeSchema,
  upgradeJobResultSchema,
  upgradeJobSchema,
  upgradeStatusSchema,
  type UpgradeBase,
  type UpgradeErrorCode,
} from '@tryghost/adapter-base-upgrade';

export interface UpgradeRequestInput {
  component: string;
  toVersion: string;
  /** Client-generated UUID v4; scoped to the staff user before it reaches the adapter. */
  idempotencyKey: string;
}

type RejectionSpec = {
  Error: typeof errors.MaintenanceError;
  code: string;
  message: string;
  help: string;
};

const unavailable = {
  Error: errors.MaintenanceError,
  code: 'UPGRADE_UNAVAILABLE',
  message: 'The update service is temporarily unavailable.',
  help: 'Retry later. Reuse the same idempotency_key if an update request lost its response.',
} satisfies RejectionSpec;

const rejections = {
  unsupported: {
    Error: errors.DisabledFeatureError,
    code: 'UPGRADE_UNSUPPORTED',
    message: 'This host does not support updating Ghost from Admin.',
    help: 'Ask your host to configure an upgrade adapter.',
  },
  unavailable,
  busy: {
    Error: errors.ConflictError,
    code: 'UPGRADE_BUSY',
    message: 'An update is already in progress.',
    help: 'Wait for the active job to finish before requesting another update.',
  },
  'target-unapproved': {
    Error: errors.ValidationError,
    code: 'UPGRADE_TARGET_UNAPPROVED',
    message: 'This update is not available as a one-click update.',
    help: 'Refresh the available updates before choosing one.',
  },
  'idempotency-conflict': {
    Error: errors.ConflictError,
    code: 'UPGRADE_IDEMPOTENCY_CONFLICT',
    message: 'This idempotency_key was already used for a different update.',
    help: 'Use a new idempotency_key for a new update request.',
  },
  'request-expired': {
    Error: errors.ConflictError,
    code: 'UPGRADE_REQUEST_EXPIRED',
    message: 'This update request has expired.',
    help: 'Check the outcome of the earlier request before making a new one.',
  },
} satisfies Record<UpgradeErrorCode, RejectionSpec>;

/** The host owns acceptance and execution; this class owns Ghost's public boundary. */
export class UpgradeService {
  readonly #getAdapter: () => UpgradeBase;
  readonly #logError: (error: Error) => void;

  constructor({
    getAdapter,
    logError,
  }: {
    getAdapter: () => UpgradeBase;
    logError: (error: Error) => void;
  }) {
    this.#getAdapter = getAdapter;
    this.#logError = logError;
  }

  /** Never rejects: an unreachable host is a status for Admin to show, not an API error. */
  async getStatus() {
    try {
      return upgradeStatusSchema.parse(await this.#getAdapter().getStatus());
    } catch (error) {
      if (!(error instanceof UpgradeAdapterError && error.code === 'unavailable')) {
        this.#logError(
          new errors.InternalServerError({
            message: 'The upgrade adapter failed during getStatus.',
            err: error instanceof Error ? error : undefined,
          }),
        );
      }
      return upgradeStatusSchema.parse({ supported: true, availability: 'unavailable' });
    }
  }

  async createRequest(input: UpgradeRequestInput, userId: string) {
    // Two staff users must never share, or be able to guess, each other's intents.
    const idempotencyKey = createHash('sha256')
      .update(JSON.stringify([userId, input.idempotencyKey]))
      .digest('hex');

    try {
      const job = upgradeJobSchema.parse(
        await this.#getAdapter().createRequest({
          component: input.component,
          toVersion: input.toVersion,
          idempotencyKey,
        }),
      );

      if (job.component !== input.component || job.toVersion !== input.toVersion) {
        throw new errors.IncorrectUsageError({
          message: 'The accepted job does not match the requested update.',
        });
      }

      return job;
    } catch (error) {
      return this.#fail(error, 'createRequest');
    }
  }

  async getJob(id: string) {
    try {
      const job = upgradeJobResultSchema.parse(await this.#getAdapter().getJob(id));

      if (job.id !== id) {
        throw new errors.IncorrectUsageError({ message: 'Lookup returned a different job.' });
      }

      return job;
    } catch (error) {
      return this.#fail(error, 'getJob');
    }
  }

  #fail(error: unknown, operation: string): never {
    if (error instanceof UpgradeAdapterError) {
      const code = upgradeErrorCodeSchema.safeParse(error.code);
      const diagnostics = upgradeDiagnosticsSchema.optional().safeParse(error.diagnostics);

      if (code.success && diagnostics.success) {
        const { Error: Rejection, ...rejection } = rejections[code.data];
        throw new Rejection({
          ...rejection,
          ...(diagnostics.data && { errorDetails: { diagnostics: diagnostics.data } }),
        });
      }
    }

    // Adapter errors and invalid output stay in the logs; the response never echoes them.
    this.#logError(
      new errors.InternalServerError({
        message: `The upgrade adapter failed during ${operation}.`,
        err: error instanceof Error ? error : undefined,
      }),
    );

    const { Error: Unavailable, ...rejection } = unavailable;
    throw new Unavailable(rejection);
  }
}
