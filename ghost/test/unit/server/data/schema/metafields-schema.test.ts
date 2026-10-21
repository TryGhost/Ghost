import assert from 'node:assert/strict';
import { FIELD_TYPE_IDS } from '@tryghost/metafield-types';
import { KeySchema, NamespaceSchema } from '@tryghost/metafield-types/identity';
import { FIELD_STATUS } from '../../../../../core/server/services/members-metafields/schema';
// @ts-expect-error This module lacks type definitions.
import schema from '../../../../../core/server/data/schema/schema';

// The static schema restates the field-type and status lists, and the rule every namespace and
// key follows, because it is read before the TS build and cannot import them. A "keep in sync"
// comment guards each restatement; these pin them to the source of truth so a divergence fails
// the build rather than shipping a schema that accepts or rejects the wrong values.
describe('members_metafields schema mirrors the source of truth', function () {
  it('type validation matches FIELD_TYPE_IDS', function () {
    assert.deepEqual(schema.members_metafields.type.validations.isIn[0], [...FIELD_TYPE_IDS]);
  });

  it('status validation matches FIELD_STATUS', function () {
    assert.deepEqual(
      schema.members_metafields.status.validations.isIn[0],
      Object.values(FIELD_STATUS),
    );
  });

  // The package states the rule as a check rather than a pattern, so the two are compared on
  // what they accept.
  it('namespace and key patterns accept what NamespaceSchema and KeySchema accept', function () {
    const samples = [
      ...['custom', 'shipping_address', 'company_2', 'a1', '_'],
      ...['', 'Custom', 'sh.op', 'com-pany', 'company\n', ' company', 'café'],
    ];
    for (const [column, rule] of [
      ['namespace', NamespaceSchema],
      ['key', KeySchema],
    ] as const) {
      const pattern = new RegExp(schema.members_metafields[column].pattern);
      for (const sample of samples) {
        assert.equal(
          pattern.test(sample),
          rule.safeParse(sample).success,
          `${column} ${JSON.stringify(sample)}`,
        );
      }
    }
  });
});
