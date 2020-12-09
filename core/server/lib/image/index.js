const request = require('../request');
const urlUtils = require('../../../shared/url-utils');
const storage = require('../../adapters/storage');
const storageUtils = require('../../adapters/storage/utils');
const validator = require('../../data/validation').validator;
const config = require('../../../shared/config');
const logging = require('../../../shared/logging');
const {i18n} = require('../common');
const settingsCache = require('../../services/settings/cache');
const ImageUtils = require('./image-utils');

module.exports = new ImageUtils({config, logging, i18n, urlUtils, settingsCache, storageUtils, storage, validator, request});