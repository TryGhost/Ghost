import errors from '@tryghost/errors';
import type { Controller, Frame } from '@tryghost/api-framework';
import { upgradeService } from '../../services/upgrades';
import { validateJobId } from './utils/validators/input/upgrades';

interface UpgradeRequestBody {
  upgrades: [{ target_version: string; idempotency_key: string }];
}

function getUpgradeInput(frame: Frame): UpgradeRequestBody['upgrades'][0] {
  // The registered upgrades.add validator has checked this body before query.
  return (frame.data as unknown as UpgradeRequestBody).upgrades[0];
}

function getService() {
  if (!upgradeService) {
    throw new errors.IncorrectUsageError({ message: 'Upgrade service was not initialized.' });
  }

  return upgradeService;
}

function getStaffUserId(frame: Frame): string {
  const user = frame.options.context?.user;
  if (typeof user !== 'string') {
    throw new errors.IncorrectUsageError({ message: 'Upgrade request has no staff user.' });
  }

  return user;
}

function getJobId(frame: Frame): string {
  const id = frame.options.id;
  if (typeof id !== 'string') {
    throw new errors.IncorrectUsageError({ message: 'Upgrade request has no job ID.' });
  }

  return id;
}

export const controller = {
  docName: 'upgrades',

  browse: {
    headers: { cacheInvalidate: false },
    permissions: true,

    query() {
      return getService().getStatus();
    },
  },

  add: {
    headers: { cacheInvalidate: false, location: false },
    statusCode: 202,
    permissions: true,

    query(frame) {
      const input = getUpgradeInput(frame);

      return getService().createRequest(
        { targetVersion: input.target_version, idempotencyKey: input.idempotency_key },
        getStaffUserId(frame),
      );
    },
  },

  read: {
    headers: { cacheInvalidate: false },
    options: ['id'],
    permissions: true,

    // Bypass the framework's ObjectId validator: upgrade jobs use UUID v4.
    validation: validateJobId,

    query(frame) {
      return getService().getJob(getJobId(frame));
    },
  },
} satisfies Controller;
