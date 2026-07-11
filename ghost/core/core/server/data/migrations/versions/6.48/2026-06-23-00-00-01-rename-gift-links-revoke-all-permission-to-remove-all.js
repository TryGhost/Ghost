const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        const revokeAll = await knex('permissions')
            .where({object_type: 'gift_link', action_type: 'revokeAll'})
            .first();
        if (!revokeAll) {
            return;
        }

        // A removeAll permission can already exist (fresh fixtures plus this migration both
        // running): the unique name rules out a rename, so drop the legacy revokeAll and its
        // grants. Otherwise rename in place, keeping the existing grants.
        const removeAllExists = await knex('permissions')
            .where({object_type: 'gift_link', action_type: 'removeAll'})
            .first();
        if (removeAllExists) {
            await knex('permissions_roles').where({permission_id: revokeAll.id}).del();
            await knex('permissions_users').where({permission_id: revokeAll.id}).del();
            await knex('permissions').where({id: revokeAll.id}).del();
            logging.info('Removed duplicate gift_link revokeAll permission (removeAll already present)');
            return;
        }

        await knex('permissions')
            .where({id: revokeAll.id})
            .update({name: 'Remove all gift links', action_type: 'removeAll', updated_at: new Date()});
        logging.info('Renamed gift_link revokeAll permission to removeAll');
    },
    async function down(knex) {
        await knex('permissions')
            .where({object_type: 'gift_link', action_type: 'removeAll'})
            .update({name: 'Revoke all gift links', action_type: 'revokeAll', updated_at: new Date()});
    }
);
