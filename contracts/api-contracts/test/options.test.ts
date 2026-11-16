import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { options } from '../src/index.ts';

const accepts = (schema: { safeParse(value: unknown): { success: boolean } }, value: unknown) =>
  schema.safeParse(value).success;

describe('option primitives', function () {
  it('accepts object ids and me, case-insensitively', function () {
    assert.ok(accepts(options.id, '5951f5fca366002ebd5dbef7'));
    assert.ok(accepts(options.id, '5951F5FCA366002EBD5DBEF7'));
    assert.ok(accepts(options.id, 'me'));
    assert.ok(!accepts(options.id, 'not-an-id'));
  });

  it('coerces numbers the way the legacy validator stringified them', function () {
    assert.equal(options.limit.parse(10), '10');
    assert.equal(options.page.parse(2), '2');
    assert.equal(options.limit.parse('all'), 'all');
    assert.ok(!accepts(options.limit, '-1'));
    assert.ok(!accepts(options.page, 'all'));
  });

  it('validates slugs and order clauses', function () {
    assert.ok(accepts(options.slug, 'my-label_1'));
    assert.ok(!accepts(options.slug, 'My Label'));
    assert.ok(accepts(options.order, 'created_at desc, name asc'));
    assert.ok(!accepts(options.order, 'name; drop'));
  });

  it('drops unknown includes instead of rejecting them', function () {
    const include = options.include(['count.members', 'tags']);
    assert.deepEqual(include.parse('Count.Members, nope,tags'), ['count.members', 'tags']);
    assert.deepEqual(include.parse(['tags', 'nope']), ['tags']);
    assert.deepEqual(include.parse(''), []);
  });

  it('rejects unknown formats', function () {
    const formats = options.formats(['mobiledoc', 'lexical']);
    assert.deepEqual(formats.parse('Lexical,mobiledoc'), ['lexical', 'mobiledoc']);
    assert.deepEqual(formats.parse(''), []);
    assert.ok(!accepts(formats, 'html'));
  });
});
