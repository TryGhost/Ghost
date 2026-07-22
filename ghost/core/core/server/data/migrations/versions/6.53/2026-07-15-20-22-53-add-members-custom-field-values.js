const {addTable} = require('../../utils');

// A member's value for one custom field definition — the table the definitions
// migration deferred. One row per (member, field); a field a member has no value
// for simply has no row.
module.exports = addTable('members_custom_field_values', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    // Values hang off the definition's internal id, not its key: the key is the
    // wire handle, the id is the stable spine.
    //
    // `custom_field_id` rather than `member_custom_field_id` (which the referenced
    // table would imply): the index name knex derives from the table plus both
    // unique columns has to fit MySQL's 64-character identifier limit, and the
    // longer form overruns it by three. SQLite has no such limit, so this only
    // fails on MySQL.
    custom_field_id: {type: 'string', maxlength: 24, nullable: false, references: 'members_custom_fields.id', cascadeDelete: true},
    member_id: {type: 'string', maxlength: 24, nullable: false, references: 'members.id', cascadeDelete: true},
    // Exactly one value column is populated per row, chosen by the field type's
    // storage type in @tryghost/custom-field-types. Splitting text from json
    // keeps text-backed values directly queryable rather than behind a JSON
    // extraction, which is what filtering will need.
    //
    // TEXT, matching the catalog's byte bound on long_text exactly, so the column
    // is a second guard rather than a formality: a value the validator somehow
    // let through still can't exceed what a member's field is allowed to hold.
    value_text: {type: 'text', maxlength: 65535, nullable: true},
    value_json: {type: 'text', maxlength: 65535, nullable: true},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true},
    // A member holds at most one value per field, so an upsert has a key to
    // target and duplicates can't accumulate.
    '@@UNIQUE_CONSTRAINTS@@': [
        ['member_id', 'custom_field_id']
    ]
});
