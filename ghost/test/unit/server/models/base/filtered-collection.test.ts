import assert from 'node:assert/strict';

const ghostBookshelf = require('../../../../../core/server/models/base');

// The filter plugin puts an apply that takes plain options on every model. Applied that way, a
// filter would skip the work its model's resolveFilter does, so the apply refuses and points at
// resolveFilter.
describe('Unit: models/base/filtered-collection', function () {
  it('refuses to apply a filter from options a model did not resolve', function () {
    const Post = ghostBookshelf.Model.extend({ tableName: 'posts' });

    assert.throws(() => Post.forge().applyDefaultAndCustomFilters({ filter: 'status:published' }), {
      name: 'IncorrectUsageError',
      help: /resolveFilter/,
    });
  });
});
