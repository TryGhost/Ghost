const configUrlHelpers = require('./lib/config-url-helpers');

/**
 * @typedef {Object} BoundHelpers
 * @property {configUrlHelpers.getSubdirFn} getSubdir
 * @property {configUrlHelpers.getSiteUrlFn} getSiteUrl
 * @property {configUrlHelpers.getAdminUrlFn} getAdminUrl
 *
 * @param {*} nconf
 */
module.exports.bindAll = (nconf) => {
    Object.keys(configUrlHelpers).forEach((helper) => {
        nconf[helper] = configUrlHelpers[helper].bind(nconf);
    });
};
