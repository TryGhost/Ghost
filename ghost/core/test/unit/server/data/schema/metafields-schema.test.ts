import assert from 'node:assert/strict';
import { FIELD_TYPE_IDS, MEMBER_ACCESS_LEVELS } from '@tryghost/metafield-types';
import { SURFACES } from '../../../../../core/server/services/metafields/access';
import { FIELD_STATUS } from '../../../../../core/server/services/metafields/schema';
import { METAFIELD_ENTITIES } from '../../../../../core/server/services/metafields/entities';
import { metafieldTables } from '../../../../../core/server/services/metafields/entity';
// @ts-expect-error This module lacks type definitions.
import schema from '../../../../../core/server/data/schema/schema';

// The static schema restates what the metafields service knows because it cannot import it:
// it feeds the schema-hash integrity check and is read before the TS build. These pin the
// two together, so a divergence fails the build rather than shipping tables the service
// reads differently from how they were made.
describe('Every entity’s metafield tables match how the service describes it', function () {
  for (const entity of METAFIELD_ENTITIES) {
    const tables = metafieldTables(entity.table);

    it(`${tables.definitions} type validation matches FIELD_TYPE_IDS`, function () {
      assert.deepEqual(schema[tables.definitions].type.validations.isIn[0], [...FIELD_TYPE_IDS]);
    });

    it(`${tables.definitions} status validation matches FIELD_STATUS`, function () {
      assert.deepEqual(
        schema[tables.definitions].status.validations.isIn[0],
        Object.values(FIELD_STATUS),
      );
    });

    it(`${tables.definitions} has a setting for exactly the doors ${entity.table} opens`, function () {
      const accessColumns: string[] = Object.values(SURFACES).map(({ column }) => column);
      const declared = Object.keys(schema[tables.definitions]).filter((column) =>
        accessColumns.includes(column),
      );

      assert.deepEqual(
        declared,
        entity.surfaces.map((surface) => SURFACES[surface].column),
      );
      for (const column of declared) {
        assert.deepEqual(schema[tables.definitions][column].validations.isIn[0], [
          ...MEMBER_ACCESS_LEVELS,
        ]);
      }
    });

    it(`${tables.values} and ${tables.changeEvents} reference a ${entity.table} record by ${entity.foreignKey}`, function () {
      for (const table of [tables.values, tables.changeEvents]) {
        assert.equal(schema[table][entity.foreignKey].references, `${entity.table}.id`);
        assert.equal(schema[table][entity.foreignKey].cascadeDelete, true);
      }
    });
  }
});
