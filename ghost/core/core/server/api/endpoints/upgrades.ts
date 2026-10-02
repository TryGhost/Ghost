import errors from '@tryghost/errors';
import { validate } from '@tryghost/admin-api-schema';
import type { Controller } from '@tryghost/api-framework';
import { upgradeJobIdSchema } from '@tryghost/adapter-base-upgrade';
import { upgradeService } from '../../services/upgrades';

interface UpgradeRequestBody {
  upgrades: [{ target_version: string; idempotency_key: string }];
}

export const controller = {
  docName: 'upgrades',

  browse: {
    headers: { cacheInvalidate: false },
    permissions: true,

    query() {
      return upgradeService!.getStatus();
    },
  },

  add: {
    headers: { cacheInvalidate: false, location: false },
    statusCode: 202,
    permissions: true,

    async validation(frame) {
      await validate({ data: frame.data, schema: 'upgrades-add', rejectUnknownFields: true });
      const input = (frame.data as unknown as UpgradeRequestBody).upgrades[0];

      // JSON Schema's UUID format accepts any version; intents require UUID v4.
      if (!upgradeJobIdSchema.safeParse(input.idempotency_key).success) {
        throw new errors.ValidationError({
          message: 'A lowercase UUID v4 idempotency_key is required.',
          context: 'Each update intent requires its own client-generated request key.',
          help: 'Generate a UUID v4 once and reuse it when retrying the same intent.',
        });
      }
    },

    query(frame) {
      const input = (frame.data as unknown as UpgradeRequestBody).upgrades[0];

      return upgradeService!.createRequest(
        { targetVersion: input.target_version, idempotencyKey: input.idempotency_key },
        frame.options.context!.user as string,
      );
    },
  },

  read: {
    headers: { cacheInvalidate: false },
    options: ['id'],
    permissions: true,

    // Override the framework's ObjectId validator: upgrade jobs use UUID v4.
    validation(frame) {
      if (!upgradeJobIdSchema.safeParse(frame.options.id).success) {
        throw new errors.ValidationError({
          message: 'A lowercase UUID v4 job ID is required.',
          help: 'Use the job ID returned when the host accepted the update request.',
        });
      }
    },

    query(frame) {
      return upgradeService!.getJob(frame.options.id as string);
    },
  },
} satisfies Controller;
