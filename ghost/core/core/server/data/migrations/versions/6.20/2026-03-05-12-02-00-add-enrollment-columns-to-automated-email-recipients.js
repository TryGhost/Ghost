const {createAddColumnMigration, combineNonTransactionalMigrations} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('automated_email_recipients', 'enrollment_id', {
        type: 'string',
        maxlength: 24,
        nullable: true,
        references: 'campaign_enrollments.id',
        cascadeDelete: true
    }),
    createAddColumnMigration('automated_email_recipients', 'step_order', {
        type: 'integer',
        nullable: true,
        unsigned: true
    })
);
