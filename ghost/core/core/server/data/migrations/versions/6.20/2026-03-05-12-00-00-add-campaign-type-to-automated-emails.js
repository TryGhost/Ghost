const {createAddColumnMigration, combineNonTransactionalMigrations} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('automated_emails', 'campaign_type', {
        type: 'string',
        maxlength: 50,
        nullable: false,
        defaultTo: 'free_signup',
        validations: {isIn: [['free_signup', 'paid_signup', 'paid_conversion']]}
    }),
    createAddColumnMigration('automated_emails', 'delay_days', {
        type: 'integer',
        nullable: false,
        unsigned: true,
        defaultTo: 0
    }),
    createAddColumnMigration('automated_emails', 'sort_order', {
        type: 'integer',
        nullable: false,
        unsigned: true,
        defaultTo: 0
    }),
    createAddColumnMigration('automated_emails', 'version', {
        type: 'integer',
        nullable: false,
        unsigned: true,
        defaultTo: 1
    })
);
