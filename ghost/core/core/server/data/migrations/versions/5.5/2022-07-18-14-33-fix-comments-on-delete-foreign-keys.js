const {addForeign, dropForeign} = require('../../../schema/commands');
const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Adding on delete SET NULL for comments');
    
        await dropForeign({
            fromTable: 'comments',
            fromColumn: 'member_id',
            toTable: 'members',
            toColumn: 'id',
            transaction: knex
        });
    
        await addForeign({
            fromTable: 'comments',
            fromColumn: 'member_id',
            toTable: 'members',
            toColumn: 'id',
            setNullDelete: true,
            transaction: knex
        });
    
        logging.info('Adding on delete CASCADE for comment_likes');
    
        await dropForeign({
            fromTable: 'comment_likes',
            fromColumn: 'member_id',
            toTable: 'members',
            toColumn: 'id',
            transaction: knex
        });
    
        await addForeign({
            fromTable: 'comment_likes',
            fromColumn: 'member_id',
            toTable: 'members',
            toColumn: 'id',
            cascadeDelete: true,
            transaction: knex
        });
    
        logging.info('Adding on delete SET NULL for comment_reports');
    
        await dropForeign({
            fromTable: 'comment_reports',
            fromColumn: 'member_id',
            toTable: 'members',
            toColumn: 'id',
            transaction: knex
        });
    
        await addForeign({
            fromTable: 'comment_reports',
            fromColumn: 'member_id',
            toTable: 'members',
            toColumn: 'id',
            setNullDelete: true,
            transaction: knex
        });
    }, 
    async function down(knex) {
        logging.info('Restoring foreign key for comments');
    
        await dropForeign({
            fromTable: 'comments',
            fromColumn: 'member_id',
            toTable: 'members',
            toColumn: 'id',
            transaction: knex
        });
    
        await addForeign({
            fromTable: 'comments',
            fromColumn: 'member_id',
            toTable: 'members',
            toColumn: 'id',
            transaction: knex
        });
    
        logging.info('Restoring foreign key for comment_likes');
    
        await dropForeign({
            fromTable: 'comment_likes',
            fromColumn: 'member_id',
            toTable: 'members',
            toColumn: 'id',
            transaction: knex
        });
    
        await addForeign({
            fromTable: 'comment_likes',
            fromColumn: 'member_id',
            toTable: 'members',
            toColumn: 'id',
            transaction: knex
        });
    
        logging.info('Restoring foreign key for comment_reports');
    
        await dropForeign({
            fromTable: 'comment_reports',
            fromColumn: 'member_id',
            toTable: 'members',
            toColumn: 'id',
            transaction: knex
        });
    
        await addForeign({
            fromTable: 'comment_reports',
            fromColumn: 'member_id',
            toTable: 'members',
            toColumn: 'id',
            transaction: knex
        });
    }
);
