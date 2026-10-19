const settingsCache = require('../../../shared/settings-cache');
const settingsHelpers = require('../settings-helpers');
const mailService = require('../../lib/mail');
const urlUtils = require('../../../shared/url-utils').default;
const Invites = require('./invites');
const models = require('../../models');
const logging = require('@tryghost/logging');

module.exports = new Invites({
  settingsCache,
  settingsHelpers,
  mailService,
  urlUtils,
  models,
  logging,
});
