const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('automated_emails', 'email_template_id', {
    type: 'string',
    maxlength: 24,
    nullable: true,
    references: 'email_templates.id'
});
