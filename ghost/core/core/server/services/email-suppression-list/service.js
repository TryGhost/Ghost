const models = require('../../models');
const configService = require('../../../shared/config');
const settingsCache = require('../../../shared/settings-cache');
const {createSuppressionProvider} = require('./suppression-provider-factory');

module.exports = createSuppressionProvider(configService, settingsCache, models);
