import assert from 'node:assert/strict';

describe('Test loader', function () {
  it('resolves a dynamic import of a TypeScript file from a file reached by require', async function () {
    const { load } = require('../../utils/fixtures/lazy-import/importer');

    const imported = await load();

    assert.equal(imported.default(), 'loaded');
    assert.equal(imported.default, require('../../utils/fixtures/lazy-import/target').default);
  });
});
