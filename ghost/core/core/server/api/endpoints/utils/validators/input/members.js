const errors = require('@tryghost/errors');
const jsonSchema = require('../utils/json-schema');
const labs = require('../../../../../../shared/labs');

// The members JSON schemas live in @tryghost/admin-api-schema and set
// `additionalProperties: false`, so ajv strips `custom_fields` out of the body
// before it reaches the service — silently, with no error to explain where the
// values went. Stash the key across validation and restore it afterwards, so
// values can ride the member body while the rest of it stays schema-validated.
//
// Gated on the flag: with the flag off, the key is stripped exactly as it is
// today. The lasting fix is declaring `custom_fields` in the schema package
// upstream, which is a separate release; this holds the seam until then.
function preserveCustomFields(validate) {
    return async function validateWithCustomFields(apiConfig, frame) {
        if (!labs.isSet('membersCustomFields') || !Array.isArray(frame.data.members)) {
            return validate(apiConfig, frame);
        }

        const stashed = frame.data.members.map(member => member && member.custom_fields);

        await validate(apiConfig, frame);

        frame.data.members.forEach((member, index) => {
            if (member && stashed[index] !== undefined) {
                member.custom_fields = stashed[index];
            }
        });
    };
}

// Setting values while *creating* a member is a later vertical, not this one. On
// add, ajv would silently strip `custom_fields` (a value that appears to vanish),
// so reject it explicitly instead — the gap is then legible rather than a mystery.
// Flag-gated, so with the flag off the key is stripped exactly as before.
function rejectCustomFieldsOnAdd(validate) {
    return function validateWithoutCustomFields(apiConfig, frame) {
        const hasCustomFields = labs.isSet('membersCustomFields')
            && Array.isArray(frame.data.members)
            && frame.data.members.some(member => member && member.custom_fields !== undefined);

        if (hasCustomFields) {
            throw new errors.ValidationError({
                message: 'Custom field values cannot be set while creating a member. Create the member, then set values with an edit.',
                property: 'custom_fields'
            });
        }

        return validate(apiConfig, frame);
    };
}

module.exports = {
    add: rejectCustomFieldsOnAdd(jsonSchema.validate),
    edit: preserveCustomFields(jsonSchema.validate)
};
