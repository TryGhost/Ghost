import assert from 'node:assert/strict';
import {memberImportRowSchema} from '../../../../../../../core/server/services/members/import-export/import/member-import-row';

// The schema is where the raw string cells the CSV reader emits become typed member
// fields. It keeps the import's long-standing lenient coercion rules exactly, so the
// kernel reads precise types without casting.
describe('member import row schema', function () {
    it('coerces subscribed leniently: true unless the cell is literally false', function () {
        assert.equal(memberImportRowSchema.parse({subscribed: 'true'}).subscribed, true);
        assert.equal(memberImportRowSchema.parse({subscribed: 'false'}).subscribed, false);
        assert.equal(memberImportRowSchema.parse({subscribed: 'FALSE'}).subscribed, false);
        assert.equal(memberImportRowSchema.parse({subscribed: ''}).subscribed, true);
        assert.equal(memberImportRowSchema.parse({subscribed: 'yes'}).subscribed, true);
        assert.equal(memberImportRowSchema.parse({}).subscribed, true, 'an omitted subscribed defaults to true');
    });

    it('coerces complimentary_plan: false unless the cell is literally true', function () {
        assert.equal(memberImportRowSchema.parse({complimentary_plan: 'true'}).complimentary_plan, true);
        assert.equal(memberImportRowSchema.parse({complimentary_plan: 'false'}).complimentary_plan, false);
        assert.equal(memberImportRowSchema.parse({complimentary_plan: 'yes'}).complimentary_plan, false);
        assert.equal(memberImportRowSchema.parse({complimentary_plan: ''}).complimentary_plan, false);
        assert.equal(memberImportRowSchema.parse({}).complimentary_plan, false, 'an omitted complimentary_plan defaults to false');
    });

    it('splits the labels cell into label objects', function () {
        assert.deepEqual(memberImportRowSchema.parse({labels: 'vip,premium'}).labels, [{name: 'vip'}, {name: 'premium'}]);
        assert.deepEqual(memberImportRowSchema.parse({labels: ''}).labels, []);
        assert.deepEqual(memberImportRowSchema.parse({}).labels, [], 'omitted labels is an empty array');
    });

    it('reads an empty (or literally "undefined") cell as absent, not the empty string', function () {
        assert.equal(memberImportRowSchema.parse({email: ''}).email, undefined);
        assert.equal(memberImportRowSchema.parse({created_at: 'undefined'}).created_at, undefined);
        assert.equal(memberImportRowSchema.parse({name: 'Bob'}).name, 'Bob');
        assert.equal(memberImportRowSchema.parse({}).email, undefined);
    });

    it('leaves string columns as strings -- an email cell reading "true" is not a boolean', function () {
        assert.equal(memberImportRowSchema.parse({email: 'true'}).email, 'true');
        assert.equal(memberImportRowSchema.parse({gift_id: 'gift_1'}).gift_id, 'gift_1');
    });

    it('carries unknown columns through so custom_fields.* survive', function () {
        const row = memberImportRowSchema.parse({email: 'a@b.com', 'custom_fields.foo': 'bar'});
        assert.equal(row['custom_fields.foo'], 'bar');
    });
});
