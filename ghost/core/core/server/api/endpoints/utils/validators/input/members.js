const jsonSchema = require('../utils/json-schema');
const labs = require('../../../../../../shared/labs');

// The members-add/edit JSON schemas (in @tryghost/admin-api-schema) set
// `additionalProperties: false`, which strips `custom_fields` from the member
// body before it reaches the service. Stash it across validation and restore it
// so custom field values can flow through member create/edit, behind the flag.
function preserveCustomFields(validate) {
    return async function validateWithCustomFields(apiConfig, frame) {
        if (!labs.isSet('membersCustomFields') || !Array.isArray(frame.data.members)) {
            return validate(apiConfig, frame);
        }

        const stashed = frame.data.members.map(member => (member ? member.custom_fields : undefined));
        await validate(apiConfig, frame);
        frame.data.members.forEach((member, index) => {
            if (member && stashed[index] !== undefined) {
                member.custom_fields = stashed[index];
            }
        });
    };
}

module.exports = {
    add: preserveCustomFields(jsonSchema.validate),
    edit: preserveCustomFields(jsonSchema.validate)
};
