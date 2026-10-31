import { lastPeriodStart } from '@tryghost/limit-service';
import config from '../../../shared/config';
import { defineService } from '../../../kernel/define-service';
import { Invites } from './invites';
import InvitationLimiter from './invitation-limiter';
import { limitService } from '../limits';

export default defineService('Invites', () => {
  const settingsCache = require('../../../shared/settings-cache');
  const settingsHelpers = require('../settings-helpers');
  const mailService = require('../../lib/mail');
  const urlUtils = require('../../../shared/url-utils').default;
  const models = require('../../models');
  const logging = require('@tryghost/logging');

  return new Invites({
    settingsCache,
    settingsHelpers,
    mailService,
    urlUtils,
    models,
    logging,
    invitationLimiter: new InvitationLimiter({
      transaction: (callback) => models.Base.transaction(callback),
      limitService,
      Settings: models.Settings,
      getPeriodStart: () =>
        config.get('hostSettings:limits:inviteEmails:maxPeriodic') !== undefined
          ? lastPeriodStart(config.get('hostSettings:subscription:start'), 'month')
          : null,
    }),
  });
});
