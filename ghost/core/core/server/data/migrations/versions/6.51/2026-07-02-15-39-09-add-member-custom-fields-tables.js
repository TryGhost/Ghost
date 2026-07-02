const {addTable, combineNonTransactionalMigrations} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    addTable('member_custom_fields', {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        key: {type: 'string', maxlength: 191, nullable: false, unique: true},
        name: {type: 'string', maxlength: 191, nullable: false},
        type: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'text', validations: {isIn: [['text']]}},
        created_at: {type: 'dateTime', nullable: false},
        updated_at: {type: 'dateTime', nullable: true}
    }),
    addTable('member_custom_field_values', {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        member_custom_field_id: {type: 'string', maxlength: 24, nullable: false, references: 'member_custom_fields.id', cascadeDelete: true},
        member_id: {type: 'string', maxlength: 24, nullable: false, references: 'members.id', cascadeDelete: true},
        value_text: {type: 'text', maxlength: 65535, nullable: true},
        created_at: {type: 'dateTime', nullable: false},
        updated_at: {type: 'dateTime', nullable: true},
        '@@UNIQUE_CONSTRAINTS@@': [
            ['member_custom_field_id', 'member_id']
        ]
    })
);
