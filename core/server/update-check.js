const _ = require('lodash');

const api = require('./api').v2;
const GhostMailer = require('./services/mail').GhostMailer;
const config = require('../shared/config');
const urlUtils = require('./../shared/url-utils');

const i18n = require('../shared/i18n');
const logging = require('../shared/logging');
const request = require('./lib/request');
const ghostVersion = require('./lib/ghost-version');
const UpdateCheckService = require('./update-check-service');

const ghostMailer = new GhostMailer();

const updateChecker = new UpdateCheckService({
    api,
    config,
    i18n,
    logging,
    urlUtils,
    request,
    ghostVersion,
    ghostMailer
});

module.exports = () => {
    const allowedCheckEnvironments = ['development', 'production'];

    // CASE: The check will not happen if your NODE_ENV is not in the allowed defined environments.
    if (_.indexOf(allowedCheckEnvironments, process.env.NODE_ENV) === -1) {
        return;
    }

    updateChecker.check();
};
