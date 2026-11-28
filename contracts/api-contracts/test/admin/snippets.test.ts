import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { snippets } from '../../src/admin/index.ts';

const mobiledoc = JSON.stringify({ version: '0.3.1', cards: [] });

describe('snippets contract', function () {
  it('requires a name and mobiledoc to add and to edit', function () {
    for (const schema of [snippets.add.body, snippets.edit.body]) {
      assert.ok(schema.safeParse({ snippets: [{ name: 'a', mobiledoc }] }).success);
      assert.ok(!schema.safeParse({ snippets: [{ name: 'a' }] }).success);
      assert.ok(!schema.safeParse({ snippets: [{ mobiledoc }] }).success);
    }
  });

  it('requires content to be valid JSON', function () {
    assert.ok(!snippets.add.body.safeParse({ snippets: [{ name: 'a', mobiledoc: '{' }] }).success);
    assert.ok(
      !snippets.add.body.safeParse({ snippets: [{ name: 'a', mobiledoc, lexical: 'nope' }] })
        .success,
    );
    assert.ok(
      snippets.add.body.safeParse({ snippets: [{ name: 'a', mobiledoc, lexical: null }] }).success,
    );
  });

  it('strips unknown body keys', function () {
    assert.deepEqual(
      snippets.add.body.parse({ snippets: [{ name: 'a', mobiledoc, id: 'x' }], extra: 1 }),
      { name: 'a', mobiledoc },
    );
  });

  it('rejects unknown formats', function () {
    assert.deepEqual(snippets.browse.options.parse({ formats: 'lexical' }), {
      formats: ['lexical'],
    });
    assert.ok(!snippets.browse.options.safeParse({ formats: 'html' }).success);
  });
});
