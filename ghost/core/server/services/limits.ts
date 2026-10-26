import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import { LimitService } from '@tryghost/limit-service';
import type { Subscription, LimitConfig } from '@tryghost/limit-service';
import type { RequestHandler } from 'express';
import config from '../../shared/config';
import db from '../data/db';

export const limitService = new LimitService();

export const getHelpLink = (): string => {
  if (
    config.get('hostSettings:billing:enabled') === true &&
    config.get('hostSettings:billing:url')
  ) {
    return config.get('hostSettings:billing:url');
  }
  return 'https://ghost.org/help/';
};

export const init = () => {
  const helpLink = getHelpLink();

  let subscription: Subscription | undefined;

  if (config.get('hostSettings:subscription')) {
    subscription = {
      startDate: config.get('hostSettings:subscription:start'),
      interval: 'month',
    };
  }

  const hostLimits: Record<string, LimitConfig> = { ...config.get('hostSettings:limits') };
  const trialStaff = hostLimits.limitTrialStaff;
  if (trialStaff) {
    hostLimits.limitTrialStaff = {
      ...trialStaff,
      currentCountQuery: async (knex) => {
        // All roles and statuses occupy a trial seat. Only the threshold matters.
        const users = await knex('users')
          .select('id')
          .limit(trialStaff.max! + 1);
        const invites = await knex('invites')
          .select('id')
          .limit(trialStaff.max! + 1);
        return users.length + invites.length;
      },
    };
  }
  const staffInvites = hostLimits.limitTrialStaffInvites;
  if (staffInvites) {
    hostLimits.limitTrialStaffInvites = {
      ...staffInvites,
      currentCountQuery: async (knex) => {
        // LIMIT bounds returned rows, not rows scanned; retain the existing schema.
        const actions = await knex('actions')
          .select('id')
          .where({ resource_type: 'invite', event: 'added' })
          .limit(staffInvites.max! + 1);
        return actions.length;
      },
    };
  }

  try {
    limitService.loadLimits({
      limits: hostLimits,
      subscription,
      db,
      helpLink,
      errors,
    });
  } catch (error) {
    // Do not block the boot process for an incorrect usage error
    if (error instanceof errors.IncorrectUsageError) {
      logging.warn(error);
    } else {
      throw error;
    }
  }
};

/**
 * Route guard for a feature a host can switch off, for the routes that exist only to
 * change it. Answers 403 with the host's own wording, which is a different thing to tell a
 * caller than the 404 a labs flag gives: the feature exists, this plan does not include it.
 */
export const requireFeature = (limitName: string): RequestHandler =>
  async function requireFeatureMw(_req, _res, next) {
    try {
      await limitService.errorIfWouldGoOverLimit(limitName);
      next();
    } catch (err) {
      next(err);
    }
  };
