// For information on writing migrations, see https://www.notion.so/ghost/Database-migrations-eb5b78c435d741d2b34a582d57c24253

const logging = require('@tryghost/logging');
const config = require('../../../../../shared/config');
const crypto = require('crypto');
const validator = require('validator');

/**
 * This migration creates a new setting for the site UUID. 
 * It will use the `site_uuid` configuration key if it is provided and is a valid UUID.
 * Otherwise, it will generate a new random UUID. 
 */

const {addSetting} = require('../../utils');

let siteUuid = config.get('site_uuid');

if (!siteUuid) {
    logging.info('No site UUID found, generating a new one');
    siteUuid = crypto.randomUUID();
} else if (!validator.isUUID(siteUuid)) {
    logging.warn(`Invalid site UUID found: ${siteUuid}. Generating a new one`);
    siteUuid = crypto.randomUUID();
}

// Use lowercase UUID for consistency
siteUuid = siteUuid.toLowerCase();

module.exports = addSetting({
    key: 'site_uuid',
    value: siteUuid,
    type: 'string',
    group: 'site',
    flags: 'PUBLIC,RO'
});