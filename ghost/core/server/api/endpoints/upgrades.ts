import type { Controller, Frame } from '@tryghost/api-framework';
import errors from '@tryghost/errors';
import snakecaseKeys from 'snakecase-keys';
import { z } from 'zod';
import {
  upgradeComponentSchema,
  upgradeJobIdSchema,
  upgradeVersionSchema,
} from '@tryghost/adapter-base-upgrade';
import upgrades from '../../services/upgrades';
import { defineEndpoints } from './utils/define-endpoints';

// Unknown keys are rejected, not stripped: a dropped execution control would otherwise go unnoticed.
const UpgradeRequestBody = z
  .object({
    upgrades: z.tuple([
      z
        .object({
          component: upgradeComponentSchema,
          to_version: upgradeVersionSchema,
          idempotency_key: z.uuid({ version: 'v4' }).lowercase(),
        })
        .strict(),
    ]),
  })
  .strict();

const JobOptions = z.object({ id: upgradeJobIdSchema });

type UpgradeFrame = Frame<{
  data: Record<string, unknown>;
  options: { id?: unknown; context: { user?: string | null } };
}>;

function parseRequest(frame: UpgradeFrame) {
  const parsed = UpgradeRequestBody.safeParse(frame.data);
  if (!parsed.success) {
    throw new errors.ValidationError({
      message: 'Expected one update with component, to_version and idempotency_key.',
      help: 'Generate a lowercase UUID v4 idempotency_key once and reuse it when retrying.',
    });
  }
  return parsed.data.upgrades[0];
}

function parseJobId(frame: UpgradeFrame) {
  const parsed = JobOptions.safeParse(frame.options);
  if (!parsed.success) {
    throw new errors.ValidationError({ message: 'Expected a job id from this host.' });
  }
  return parsed.data.id;
}

// The adapter contract is camelCase; the Admin API is snake_case.
const toApi = <T extends Record<string, unknown>>(resource: T) =>
  snakecaseKeys(resource, { deep: true });

const noCacheInvalidation = { cacheInvalidate: false };

// Handed the upgrades service: nothing here reads it off the module it imports.
const endpoints = defineEndpoints({ upgrades }, (handed) => {
  return {
    docName: 'upgrades',

    browse: {
      headers: noCacheInvalidation,
      permissions: true,
      async query() {
        return toApi(await handed.upgrades.getStatus());
      },
    },

    add: {
      headers: { ...noCacheInvalidation, location: false },
      statusCode: 202,
      // A validation function replaces the framework's defaults, which expect resource bodies.
      validation(frame) {
        parseRequest(frame);
      },
      permissions: true,
      async query(frame) {
        const input = parseRequest(frame);
        const user = frame.options.context.user;
        if (!user) {
          throw new errors.NoPermissionError({ message: 'Only staff users can request updates.' });
        }

        const job = await handed.upgrades.createRequest(
          {
            component: input.component,
            toVersion: input.to_version,
            idempotencyKey: input.idempotency_key,
          },
          user,
        );
        return toApi(job);
      },
    },

    read: {
      headers: noCacheInvalidation,
      options: ['id'],
      // The framework's id validator only accepts ObjectIds; jobs use UUIDs.
      validation(frame) {
        parseJobId(frame);
      },
      permissions: true,
      async query(frame) {
        return toApi(await handed.upgrades.getJob(parseJobId(frame)));
      },
    },
  } satisfies Controller<{ browse: UpgradeFrame; add: UpgradeFrame; read: UpgradeFrame }>;
});

module.exports = endpoints;
