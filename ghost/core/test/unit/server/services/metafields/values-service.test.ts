import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { metafieldEntity } from '../../../../../core/server/services/metafields/entity';
import { MetafieldValuesService } from '../../../../../core/server/services/metafields/values-service';

// Members' tables, described as an entity only staff write to.
const STAFF_WRITTEN = metafieldEntity({
  table: 'members',
  foreignKey: 'member_id',
  writers: ['user'],
  surfaces: [],
  definitionResource: 'member_custom_field',
});

describe('MetafieldValuesService', function () {
  it('refuses a write from someone its entity is not written by', async function () {
    // Refused before the database is reached, so there is none to give it.
    const values = new MetafieldValuesService({
      knex: {} as never,
      entity: STAFF_WRITTEN,
      getMaxDefinitions: () => 100,
    });

    await assert.rejects(
      values.applyWrite('record_1', [], {
        // @ts-expect-error an integration does not write this entity's values
        writtenBy: { type: 'integration', id: 'integration_1' },
        source: 'admin_api',
      }),
      /members metafields cannot be written by integration/,
    );
  });
});
