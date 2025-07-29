/**
 * This migration creates a new setting for the site UUID. 
 * It will use the `site_uuid` configuration key if it is provided and is a valid UUID.
 * Otherwise, it will generate a new random UUID. 
 */

const {addSetting} = require('../../utils');
const {getOrGenerateSiteUuid} = require('../../../../services/settings/settings-utils');

module.exports = addSetting({
    key: 'site_uuid',
    value: getOrGenerateSiteUuid(),
    type: 'string',
    group: 'core',
    flags: 'PUBLIC,RO'
});