const request = require('@tryghost/request');
const urlUtils = require('../../../shared/url-utils');
const storageUtils = require('../../adapters/storage/utils');
const validator = require('@tryghost/validator');
const config = require('../../../shared/config');
const settingsCache = require('../../../shared/settings-cache');
const ImageUtils = require('./image-utils');

const adapterManager = require('../../services/adapter-manager').default;

const cacheStore = adapterManager.getAdapter('cache:imageSizes');
const imageStore = adapterManager.getAdapter('storage:images');

module.exports = new ImageUtils({
    config,
    urlUtils,
    settingsCache,
    storageUtils,
    imageStore,
    validator,
    request,
    cacheStore
});
