const assert = require('node:assert/strict');
const {FIELD_TYPE_IDS} = require('@tryghost/custom-field-types');
const {FIELD_STATUS} = require('../../../../../core/server/services/members-custom-fields/schema');

const schema = require('../../../../../core/server/data/schema/schema');

// The static schema restates the field-type and status lists because it cannot import them:
// it feeds the schema-hash integrity check and is read before the TS build. A "keep in sync"
// comment guards each restatement; these pin them to the source of truth so a divergence
// fails the build rather than shipping a schema that accepts or rejects the wrong values.
describe('members_custom_fields schema mirrors the source of truth', function () {
    it('type validation matches FIELD_TYPE_IDS', function () {
        assert.deepEqual(schema.members_custom_fields.type.validations.isIn[0], [...FIELD_TYPE_IDS]);
    });

    it('status validation matches FIELD_STATUS', function () {
        assert.deepEqual(schema.members_custom_fields.status.validations.isIn[0], Object.values(FIELD_STATUS));
    });
});
