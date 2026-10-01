import assert from 'node:assert/strict';
import { FIELD_TYPE_IDS, MEMBER_ACCESS_LEVELS } from '@tryghost/metafield-types';
import { SURFACES } from '../../../../../core/server/services/metafields/access';
import { FIELD_STATUS } from '../../../../../core/server/services/metafields/schema';
import {
  metafieldEntities,
  metafieldTables,
} from '../../../../../core/server/services/metafields/entity';
// @ts-expect-error This module lacks type definitions.
import schema from '../../../../../core/server/data/schema/schema';

// The static schema restates the field-type, status and access lists because it cannot
// import them: it feeds the schema-hash integrity check and is read before the TS build. A
// "keep in sync" comment guards each restatement; these pin them to the source of truth so a
// divergence fails the build rather than shipping a schema that accepts or rejects the wrong
// values.
describe('Every entity’s metafield definitions mirror the source of truth', function () {
  for (const entity of metafieldEntities()) {
    const table = metafieldTables(entity.table).definitions;

    it(`${table} type validation matches FIELD_TYPE_IDS`, function () {
      assert.deepEqual(schema[table].type.validations.isIn[0], [...FIELD_TYPE_IDS]);
    });

    it(`${table} status validation matches FIELD_STATUS`, function () {
      assert.deepEqual(schema[table].status.validations.isIn[0], Object.values(FIELD_STATUS));
    });

    for (const surface of entity.surfaces) {
      const { column } = SURFACES[surface];
      it(`${table} ${column} validation matches the access levels`, function () {
        assert.deepEqual(schema[table][column].validations.isIn[0], [...MEMBER_ACCESS_LEVELS]);
      });
    }
  }
});
