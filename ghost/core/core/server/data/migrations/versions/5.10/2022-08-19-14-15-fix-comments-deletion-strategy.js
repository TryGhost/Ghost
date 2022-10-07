const {addForeign, dropForeign} = require('../../../schema/commands');
const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Adding on delete CASCADE for comments parent_id');

        await dropForeign({
            fromTable: 'comments',
            fromColumn: 'parent_id',
            toTable: 'comments',
            toColumn: 'id',
            transaction: knex
        });

        await addForeign({
            fromTable: 'comments',
            fromColumn: 'parent_id',
            toTable: 'comments',
            toColumn: 'id',
            cascadeDelete: true,
            transaction: knex
        });
    },
    async function down(knex) {
        logging.info('Restoring foreign key for comments parent_id');

        await dropForeign({
            fromTable: 'comments',
            fromColumn: 'parent_id',
            toTable: 'comments',
            toColumn: 'id',
            transaction: knex
        });

        await addForeign({
            fromTable: 'comments',
            fromColumn: 'parent_id',
            toTable: 'comments',
            toColumn: 'id',
            transaction: knex
        });
    }
);
