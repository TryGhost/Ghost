const logging = require('@tryghost/logging');
const config = require('../../../../../shared/config');
const crypto = require('crypto');
const validator = require('@tryghost/validator');

/**
 * This migration creates a new setting for the site UUID. 
 * It will use the `site_uuid` configuration key if it is provided and is a valid UUID.
 * Otherwise, it will generate a new random UUID. 
 */

const {addSetting} = require('../../utils');

const getOrGenerateSiteUuid = () => {
    let siteUuid;
    try {
        let configuredSiteUuid = config.get('site_uuid');
        if (configuredSiteUuid && validator.isUUID(configuredSiteUuid)) {
            logging.info(`Using configured site UUID: ${configuredSiteUuid}`);
            siteUuid = configuredSiteUuid.toLowerCase();
        } else {
            logging.info('No valid site UUID found, generating a new one');
            siteUuid = crypto.randomUUID();
        }
    } catch (error) {
        logging.error('Error getting site UUID from config. Generating a new one', error);
        siteUuid = crypto.randomUUID();
    }
    siteUuid = siteUuid.toLowerCase();
    logging.info(`Using site UUID: ${siteUuid}`);
    return siteUuid;
};

module.exports = addSetting({
    key: 'site_uuid',
    value: getOrGenerateSiteUuid(),
    type: 'string',
    group: 'core',
    flags: 'PUBLIC,RO'
});