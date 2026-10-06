import assert from 'node:assert/strict';
import { FIELD_TYPE_IDS } from '@tryghost/metafield-types';
import { IDENTITY_SEGMENT } from '@tryghost/metafield-types/identity';
import { FIELD_STATUS } from '../../../../../core/server/services/members-metafields/schema';
// @ts-expect-error This module lacks type definitions.
import schema from '../../../../../core/server/data/schema/schema';

// The static schema restates the field-type and status lists because it cannot import them:
// it feeds the schema-hash integrity check and is read before the TS build. A "keep in sync"
// comment guards each restatement; these pin them to the source of truth so a divergence
// fails the build rather than shipping a schema that accepts or rejects the wrong values.
describe('members_metafields schema mirrors the source of truth', function () {
  it('type validation matches FIELD_TYPE_IDS', function () {
    assert.deepEqual(schema.members_metafields.type.validations.isIn[0], [...FIELD_TYPE_IDS]);
  });

  it('namespace and key patterns match IDENTITY_SEGMENT', function () {
    assert.equal(schema.members_metafields.namespace.pattern, IDENTITY_SEGMENT.source);
    assert.equal(schema.members_metafields.key.pattern, IDENTITY_SEGMENT.source);
  });

  it('status validation matches FIELD_STATUS', function () {
    assert.deepEqual(
      schema.members_metafields.status.validations.isIn[0],
      Object.values(FIELD_STATUS),
    );
  });
});
