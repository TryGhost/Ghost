import { defineService } from '../../../kernel/define-service';
import { Invites } from './invites';

export default defineService('Invites', () => {
  const settingsCache = require('../../../shared/settings-cache');
  const settingsHelpers = require('../settings-helpers');
  const mailService = require('../../lib/mail');
  const urlUtils = require('../../../shared/url-utils').default;
  const models: typeof import('../../models') = require('../../models');
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
