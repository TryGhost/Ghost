import {
  lockStaffInvites,
  checkTrialStaffLimit,
  STAFF_INVITE_RATE_KEY,
} from '../../lib/staff-invite-usage';
import { defineService } from '../../../kernel/define-service';
import InvitationLimiter from './invitation-limiter';
import { getHelpLink } from '../limits';
// @ts-expect-error The existing CommonJS implementation has no type declarations.
import Invites from './invites';

export default defineService('Invites', () => {
  const settingsCache = require('../../../shared/settings-cache');
  const settingsHelpers = require('../settings-helpers');
  const mailService = require('../../lib/mail');
  const urlUtils = require('../../../shared/url-utils').default;
  const models = require('../../models');
  const logging = require('@tryghost/logging');
  const config = require('../../../shared/config');
  const db = require('../../data/db');

  return new Invites({
    settingsCache,
    settingsHelpers,
    mailService,
    urlUtils,
    models,
    logging,
    invitationLimiter: new InvitationLimiter(
      { lockStaffInvites, checkTrialStaffLimit, STAFF_INVITE_RATE_KEY },
      db.knex,
      () => config.get('hostSettings:staffInvites'),
      Date.now,
      getHelpLink,
    ),
  });
});
