import { lockStaffInvites } from '../../lib/staff-invite-usage';
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
    limitService,
    invitationLimiter: new InvitationLimiter({
      transaction: (callback) => models.Base.transaction(callback),
      limitService,
      lockStaffInvites,
    }),
  });
});
