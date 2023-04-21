// For information on writing migrations, see https://www.notion.so/ghost/Database-migrations-eb5b78c435d741d2b34a582d57c24253

const {createAddColumnMigration} = require('../../utils');

// status: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'draft', validations: {isIn: [['published', 'draft', 'scheduled', 'sent']]}},

module.exports = createAddColumnMigration('post_revisions', 'post_status', {
    type: 'string',
    maxlength: 50,
    nullable: false,
    defaultTo: 'draft',
    validations: {
        isIn: [['published', 'draft', 'scheduled', 'sent']]
    }
});
