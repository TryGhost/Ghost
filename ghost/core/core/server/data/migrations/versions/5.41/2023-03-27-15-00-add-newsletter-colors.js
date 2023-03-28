const {createAddColumnMigration, combineNonTransactionalMigrations} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('newsletters', 'background_color', {
        type: 'string',
        maxlength: 50,
        nullable: false,
        defaultTo: 'light'
    }),

    createAddColumnMigration('newsletters', 'border_color', {
        type: 'string',
        maxlength: 50,
        nullable: true
    }),

    createAddColumnMigration('newsletters', 'title_color', {
        type: 'string',
        maxlength: 50,
        nullable: true
    })
);
