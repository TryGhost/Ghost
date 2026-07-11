const {createTransactionalMigration} = require('../../utils');

// The `resetAllPasswords` action on the `authentication` object backed the
// orphaned `/authentication/global_password_reset` endpoint. That endpoint is
// replaced by `/authentication/reset`, which rotates every credential
// (api keys, passwords, sessions) in one shot — so we rename the existing
// permission row to match its new contract rather than introduce a fresh row
// alongside a stale one.

module.exports = createTransactionalMigration(
    async function up(knex) {
        await knex('permissions')
            .where({action_type: 'resetAllPasswords', object_type: 'authentication'})
            .update({name: 'Reset authentication', action_type: 'reset'});
    },
    async function down(knex) {
        await knex('permissions')
            .where({action_type: 'reset', object_type: 'authentication'})
            .update({name: 'Reset all passwords', action_type: 'resetAllPasswords'});
    }
);
