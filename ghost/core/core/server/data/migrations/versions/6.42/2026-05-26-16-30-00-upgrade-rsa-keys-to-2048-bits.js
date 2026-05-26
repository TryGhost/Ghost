const keypair = require('keypair');
const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');
const {RSA_KEY_BITS_FOR_RS512, isRsaKeyCompatibleWithRS512} = require('../../../../lib/rsa-key-utils');

const KEY_PAIRS = [
    {privateKey: 'members_private_key', publicKey: 'members_public_key'},
    {privateKey: 'ghost_private_key', publicKey: 'ghost_public_key'}
];

/** @type {Record<string, string>} */
const backups = {};

module.exports = createTransactionalMigration(
    async function up(knex) {
        for (const {privateKey, publicKey} of KEY_PAIRS) {
            const rows = await knex('settings')
                .whereIn('key', [privateKey, publicKey])
                .select('key', 'value');

            const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
            const existingPublicKey = values[publicKey];

            if (!existingPublicKey) {
                logging.warn(`Skipping RSA key upgrade: ${publicKey} is not set`);
                continue;
            }

            if (isRsaKeyCompatibleWithRS512(existingPublicKey)) {
                logging.info(`Skipping RSA key upgrade: ${publicKey} already meets RS512 requirements`);
                continue;
            }

            logging.info(`Upgrading ${privateKey} and ${publicKey} to ${RSA_KEY_BITS_FOR_RS512}-bit RSA keys`);

            backups[privateKey] = values[privateKey];
            backups[publicKey] = existingPublicKey;

            const upgraded = keypair({bits: RSA_KEY_BITS_FOR_RS512});

            await knex('settings').where('key', privateKey).update({value: upgraded.private});
            await knex('settings').where('key', publicKey).update({value: upgraded.public});
        }
    },
    async function down(knex) {
        for (const [key, value] of Object.entries(backups)) {
            const existing = await knex('settings').where('key', key).first();

            if (!existing) {
                logging.warn(`Skipping RSA key rollback: ${key} is not set`);
                continue;
            }

            logging.info(`Restoring previous value for ${key}`);
            await knex('settings').where('key', key).update({value});
        }
    }
);
