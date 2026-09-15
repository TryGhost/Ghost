/**
 * ATProto auth service entry point.
 *
 * Initialised once at boot (via boot.js) when atproto.enabled is true.
 * Exports the service instance and a no-op fallback for disabled installs.
 */
const config = require('../../../shared/config');
const urlUtils = require('../../../shared/url-utils').default;
const settingsCache = require('../../../shared/settings-cache');
const db = require('../../data/db');
const membersService = require('../members');
const AtprotoAuthService = require('./atproto-auth-service');

let _service = null;

/**
 * @returns {AtprotoAuthService|null}  null when atproto is disabled
 */
function getService() {
    return _service;
}

/**
 * Call once at boot.  Safe to call when atproto.enabled is false.
 */
function init() {
    if (!config.get('atproto:enabled')) {
        return;
    }

    _service = new AtprotoAuthService({
        config,
        urlUtils,
        getMembersApi: () => membersService.api,
        settingsCache,
        db: db.knex
    });
}

module.exports = {init, getService};
