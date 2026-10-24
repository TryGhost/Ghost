import { defineService } from '../../../kernel/define-service';
import { Invites } from './invites';
import type { InviteAcceptanceModelRegistry } from '../../models/invite-acceptance';

export default defineService('Invites', () => {
  const settingsCache = require('../../../shared/settings-cache');
  const settingsHelpers = require('../settings-helpers');
  const mailService = require('../../lib/mail');
  const urlUtils = require('../../../shared/url-utils').default;
  const models: InviteAcceptanceModelRegistry = require('../../models');
  const logging = require('@tryghost/logging');

  return new Invites({
    settingsCache,
    settingsHelpers,
    mailService,
    urlUtils,
    models,
    logging,
  });
});
