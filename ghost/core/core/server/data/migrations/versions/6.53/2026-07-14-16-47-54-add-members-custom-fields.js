const {addTable} = require('../../utils');

// The custom field definitions table. Member values are stored separately and
// added in a later migration alongside the value read/write path.
module.exports = addTable('members_custom_fields', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    key: {type: 'string', maxlength: 191, nullable: false, unique: true},
    // Names are globally unique (across active + archived) so the label is
    // unambiguous. To reuse a name, rename the archived field to free it.
    name: {type: 'string', maxlength: 191, nullable: false, unique: true},
    type: {type: 'string', maxlength: 50, nullable: false, validations: {isIn: [['short_text', 'long_text', 'address']]}},
    // Soft delete: fields are archived, never hard-deleted, so their key stays
    // reserved forever (matches the newsletters status pattern).
    status: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'active', validations: {isIn: [['active', 'archived']]}},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true}
});
