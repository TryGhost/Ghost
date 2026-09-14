const {addTable, combineNonTransactionalMigrations} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    addTable('forms', {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        name: {type: 'string', maxlength: 191, nullable: false},
        description: {type: 'string', maxlength: 2000, nullable: true},
        status: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'active', validations: {isIn: [['active', 'archived']]}},
        schema: {type: 'text', maxlength: 1000000000, fieldtype: 'long', nullable: false},
        created_at: {type: 'dateTime', nullable: false},
        updated_at: {type: 'dateTime', nullable: true}
    }),
    addTable('form_submissions', {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        form_id: {type: 'string', maxlength: 24, nullable: false, references: 'forms.id', cascadeDelete: true},
        data: {type: 'text', maxlength: 1000000000, fieldtype: 'long', nullable: false},
        created_at: {type: 'dateTime', nullable: false},
        updated_at: {type: 'dateTime', nullable: true},
        '@@INDEXES@@': [
            ['form_id', 'created_at']
        ]
    })
);
