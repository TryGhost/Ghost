const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('automated_emails', 'email_design_setting_id', {
    type: 'string',
    maxlength: 24,
    nullable: true,
    references: 'email_design_settings.id'
});
