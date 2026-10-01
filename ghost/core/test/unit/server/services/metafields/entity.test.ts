import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import {
  describeMetafieldEntity,
  metafieldEntities,
} from '../../../../../core/server/services/metafields/entity';

const recordReference = (table: string) => ({ type: 'string', references: `${table}.id` });

/** A schema giving `posts` metafield tables, with whatever columns a case needs. */
function postsSchema({
  definitions = {},
  valuesKey = 'post_id',
  changeEventsKey = 'post_id',
}: {
  definitions?: Record<string, object>;
  valuesKey?: string;
  changeEventsKey?: string;
} = {}) {
  return {
    posts: { id: { type: 'string' } },
    posts_metafields: { id: { type: 'string' }, ...definitions },
    posts_metafield_values: { id: { type: 'string' }, [valuesKey]: recordReference('posts') },
    posts_metafield_change_events: {
      id: { type: 'string' },
      [changeEventsKey]: recordReference('posts'),
    },
  };
}

describe('describeMetafieldEntity', function () {
  it('reads an entity off its metafield tables', function () {
    assert.deepEqual(describeMetafieldEntity('posts', postsSchema()), {
      table: 'posts',
      foreignKey: 'post_id',
      surfaces: [],
      definitionResource: 'post_custom_field',
    });
  });

  it('opens fields to the doors its definitions have a setting for', function () {
    const tables = postsSchema({ definitions: { member_access: { type: 'string' } } });

    assert.deepEqual(describeMetafieldEntity('posts', tables).surfaces, ['member']);
  });

  it('refuses an entity the schema gives no metafield tables', function () {
    assert.throws(
      () => describeMetafieldEntity('tags', postsSchema()),
      /tags cannot carry metafields: the schema has no metafield tables for it/,
    );
  });

  it('refuses tables that disagree on how they point back at a record', function () {
    assert.throws(
      () => describeMetafieldEntity('posts', postsSchema({ changeEventsKey: 'record_id' })),
      /posts cannot carry metafields/,
    );
  });

  it('finds every entity with metafield tables, and nothing else', function () {
    const tables = { ...postsSchema(), tags: { id: { type: 'string' } } };

    assert.deepEqual(
      metafieldEntities(tables).map((entity) => entity.table),
      ['posts'],
    );
  });
});
