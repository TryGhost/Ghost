import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import { LimitService } from '@tryghost/limit-service';
import type { Subscription } from '@tryghost/limit-service';
import config from '../../shared/config';
import db from '../data/db';

export const limitService = new LimitService();

export const init = () => {
  let helpLink;

  if (
    config.get('hostSettings:billing:enabled') &&
    config.get('hostSettings:billing:enabled') === true &&
    config.get('hostSettings:billing:url')
  ) {
    helpLink = config.get('hostSettings:billing:url');
  } else {
    helpLink = 'https://ghost.org/help/';
  }

  let subscription: Subscription | undefined;

  if (config.get('hostSettings:subscription')) {
    subscription = {
      startDate: config.get('hostSettings:subscription:start'),
      interval: 'month',
    };
  }

  const hostLimits = config.get('hostSettings:limits') || {};

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
