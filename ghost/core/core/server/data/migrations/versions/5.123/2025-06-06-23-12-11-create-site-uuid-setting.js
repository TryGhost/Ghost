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

let siteUuid;
try {
    siteUuid = config.get('site_uuid');

    if (!siteUuid) {
        logging.info('No site UUID found, generating a new one');
        siteUuid = crypto.randomUUID();
    }

    if (!validator.isUUID(siteUuid)) {
        logging.warn(`Invalid site UUID found: ${siteUuid}. Generating a new one`);
        siteUuid = crypto.randomUUID();
    }
} catch (error) {
    logging.error('Error getting site UUID from config. Generating a new one', error);
    siteUuid = crypto.randomUUID();
}

module.exports = addSetting({
    key: 'site_uuid',
    value: siteUuid.toLowerCase(),
    type: 'string',
    group: 'core',
    flags: 'PUBLIC,RO'
});