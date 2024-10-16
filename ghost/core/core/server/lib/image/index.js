const request = require('@tryghost/request');
const urlUtils = require('../../../shared/url-utils');
const storage = require('../../adapters/storage');
const storageUtils = require('../../adapters/storage/utils');
const validator = require('@tryghost/validator');
const config = require('../../../shared/config');
const settingsCache = require('../../../shared/settings-cache');
const ImageUtils = require('./ImageUtils');

const adapterManager = require('../../services/adapter-manager');

const cacheStore = adapterManager.getAdapter('cache:imageSizes');

module.exports = new ImageUtils({
    config,
    urlUtils,
    settingsCache,
    storageUtils,
    storage,
    validator,
    request,
    cacheStore
});
