const IndexNowService = require('./indexnow-service');
const settingsCache = require('../../../shared/settings-cache');
const config = require('../../../shared/config');
const labs = require('../../../shared/labs');
const urlService = require('../url');
const urlUtils = require('../../../shared/url-utils');
const request = require('@tryghost/request');
const logging = require('@tryghost/logging');
const events = require('../../lib/common/events');

let service;

module.exports.init = function init() {
    if (service) {
        return;
    }

    service = new IndexNowService({
        settingsCache,
        config,
        labs,
        urlService,
        urlUtils,
        request,
        logging,
        events
    });

    service.subscribeEvents();
};
