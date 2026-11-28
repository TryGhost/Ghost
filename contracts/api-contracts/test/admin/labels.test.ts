import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { labels } from '../../src/admin/index.ts';

const ID = '5951f5fca366002ebd5dbef7';

describe('labels contract', function () {
  it('strips unknown body keys, including id', function () {
    const body = labels.edit.body.parse({
      labels: [{ id: ID, name: 'VIP', created_at: 'now' }],
      extra: true,
    });
    assert.deepEqual(body, { name: 'VIP' });
  });

  it('requires a name to add, but not to edit', function () {
    assert.ok(!labels.add.body.safeParse({ labels: [{ slug: 'vip' }] }).success);
    assert.ok(labels.edit.body.safeParse({ labels: [{ slug: 'vip' }] }).success);
  });

  it('rejects names that are empty, too long or start with a comma', function () {
    for (const name of ['', 'a'.repeat(192), ',vip']) {
      assert.ok(!labels.add.body.safeParse({ labels: [{ name }] }).success, name);
    }
    assert.ok(labels.add.body.safeParse({ labels: [{ name: 'a'.repeat(191) }] }).success);
    assert.ok(labels.add.body.safeParse({ labels: [{ name: 'vip,gold' }] }).success);
  });

  it('allows a null slug', function () {
    assert.ok(labels.add.body.safeParse({ labels: [{ name: 'VIP', slug: null }] }).success);
  });

  it('requires exactly one label under the root key', function () {
    for (const body of [
      undefined,
      {},
      { labels: [] },
      { labels: [{ name: 'a' }, { name: 'b' }] },
    ]) {
      assert.ok(!labels.add.body.safeParse(body).success, JSON.stringify(body));
    }
  });

  it('requires an id to edit or destroy', function () {
    assert.ok(!labels.edit.options.safeParse({}).success);
    assert.ok(!labels.destroy.options.safeParse({}).success);
    assert.ok(labels.destroy.options.safeParse({ id: ID }).success);
  });

  it('reads by id or slug and filters includes', function () {
    assert.deepEqual(labels.read.options.parse({ slug: 'vip', include: 'count.members,posts' }), {
      slug: 'vip',
      include: ['count.members'],
    });
    assert.ok(!labels.read.options.safeParse({ slug: 'Not A Slug' }).success);
  });

  it('validates browse pagination', function () {
    assert.ok(
      labels.browse.options.safeParse({ limit: 'all', page: '2', order: 'name asc' }).success,
    );
    assert.ok(!labels.browse.options.safeParse({ limit: 'many' }).success);
  });
});
