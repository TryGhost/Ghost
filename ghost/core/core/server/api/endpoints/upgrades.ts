import errors from '@tryghost/errors';
import { z } from 'zod';
import { upgradeJobIdSchema, upgradeVersionSchema } from '@tryghost/adapter-base-upgrade';
import { upgradeService } from '../../services/upgrades';
const models = require('../../models');

const requestBody = z
  .object({
    upgrades: z
      .array(
        z
          .object({
            targetVersion: upgradeVersionSchema,
            idempotencyKey: upgradeJobIdSchema,
          })
          .strict(),
      )
      .length(1),
  })
  .strict();

interface Frame<Data = unknown> {
  data: Data;
  options: { id?: string; context?: { user?: string; integration?: string } };
}

// Query methods run after the API pipeline has validated the frame.
interface ReadFrame extends Frame {
  options: Frame['options'] & { id: string };
}

async function permissions(frame: Frame) {
  const context = frame.options.context;

  if (!context?.user || context.integration) {
    throw new errors.NoPermissionError({
      message: 'Only owners and administrators can manage updates.',
    });
  }

  const user = await models.User.findOne({ id: context.user }, { withRelated: ['roles'] });
  if (!user || !(user.hasRole('Owner') || user.hasRole('Administrator'))) {
    throw new errors.NoPermissionError({
      message: 'Only owners and administrators can manage updates.',
    });
  }
}

/** @type {import('@tryghost/api-framework').Controller} */
export const controller = {
  docName: 'upgrades',

  browse: {
    headers: { cacheInvalidate: false },
    permissions,

    query() {
      return upgradeService.getStatus();
    },
  },

  add: {
    headers: { cacheInvalidate: false, location: false },
    statusCode: 202,
    permissions,

    validation(frame: Frame) {
      const parsed = requestBody.safeParse(frame.data);

      if (!parsed.success) {
        throw new errors.ValidationError({
          message:
            'Supply exactly one upgrade containing targetVersion and a UUID v4 idempotencyKey.',
        });
      }

      frame.data = parsed.data;
    },

    query(frame: Frame<z.infer<typeof requestBody>>) {
      return upgradeService.createRequest(frame.data.upgrades[0], frame.options.context!.user!);
    },
  },

  read: {
    headers: { cacheInvalidate: false },
    options: ['id'],
    permissions,

    // Override the framework's ObjectId validator: upgrade jobs use UUID v4.
    validation(frame: Frame) {
      const parsed = upgradeJobIdSchema.safeParse(frame.options.id);

      if (!parsed.success) {
        throw new errors.ValidationError({ message: 'A lowercase UUID v4 job ID is required.' });
      }

      frame.options.id = parsed.data;
    },

    query(frame: ReadFrame) {
      return upgradeService.getJob(frame.options.id);
    },
  },
};
