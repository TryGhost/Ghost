import { defineService } from '../../../kernel/define-service';
// @ts-expect-error The existing CommonJS implementation has no type declarations.
import Invites from './invites';

export default defineService('Invites', () => {
  const settingsCache = require('../../../shared/settings-cache');
  const settingsHelpers = require('../settings-helpers');
  const mailService = require('../../lib/mail');
  const urlUtils = require('../../../shared/url-utils').default;
  const models = require('../../models');
  const logging = require('@tryghost/logging');
  const { limitService } = require('../limits');

  return new Invites({
    settingsCache,
    settingsHelpers,
    mailService,
    urlUtils,
    models,
    logging,
    limitService,
  });
});
