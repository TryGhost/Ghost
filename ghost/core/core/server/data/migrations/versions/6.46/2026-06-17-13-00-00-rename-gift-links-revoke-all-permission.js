const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        const resetAll = await knex('permissions')
            .where({object_type: 'gift_link', action_type: 'resetAll'})
            .first();
        if (!resetAll) {
            return;
        }

        // A revokeAll permission can already exist (fresh fixtures plus the slice-1
        // permission migration both running): the unique name rules out a rename, so
        // drop the legacy resetAll and its grants. Otherwise rename in place, keeping
        // the existing grants.
        const revokeAllExists = await knex('permissions')
            .where({object_type: 'gift_link', action_type: 'revokeAll'})
            .first();
        if (revokeAllExists) {
            await knex('permissions_roles').where({permission_id: resetAll.id}).del();
            await knex('permissions_users').where({permission_id: resetAll.id}).del();
            await knex('permissions').where({id: resetAll.id}).del();
            logging.info('Removed duplicate gift_link resetAll permission (revokeAll already present)');
            return;
        }

        await knex('permissions')
            .where({id: resetAll.id})
            .update({name: 'Revoke all gift links', action_type: 'revokeAll', updated_at: new Date()});
        logging.info('Renamed gift_link resetAll permission to revokeAll');
    },
    async function down(knex) {
        await knex('permissions')
            .where({object_type: 'gift_link', action_type: 'revokeAll'})
            .update({name: 'Reset all gift links', action_type: 'resetAll', updated_at: new Date()});
    }
);
