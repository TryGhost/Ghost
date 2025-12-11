// For information on writing migrations, see https://www.notion.so/ghost/Database-migrations-eb5b78c435d741d2b34a582d57c24253

const {createAddColumnMigration, combineNonTransactionalMigrations} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    // Add commenting_enabled to members table - tracks if member can comment
    createAddColumnMigration('members', 'commenting_enabled', {
        type: 'boolean',
        nullable: false,
        defaultTo: true
    }),

    // Add hidden_at_ban to comments table - tracks if comment was hidden due to member ban
    createAddColumnMigration('comments', 'hidden_at_ban', {
        type: 'boolean',
        nullable: false,
        defaultTo: false
    })
);
