const {combineTransactionalMigrations, removeSetting} = require('../../utils');
const logging = require('@tryghost/logging');

module.exports = combineTransactionalMigrations(
    removeSetting('ghost_private_key'),
    removeSetting('ghost_public_key'),
    removeSetting('members_private_key'),
    removeSetting('members_public_key')
);

logging.info('Migration: Removing RSA keys to regenerate with 2048-bit length on next startup');