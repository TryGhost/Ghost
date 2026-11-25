import assert from 'node:assert/strict';
import { resolveFilterWithSteps } from '../../../../../core/server/models/base/plugins/filtered-collection';

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

// A model whose filter is resolved by steps has no stage for the enforced, default and extra
// filters or the CTE the filter plugin applies. No model on that path declares them, so no API
// request reaches the refusal, which keeps the next model moved onto that path from querying
// without a filter it relies on.
describe('Unit: models/base/filtered-collection, a model whose filter is resolved by steps', function () {
  it('refuses a model with an enforced, default or extra filter', async function () {
    const Post = ghostBookshelf.Model.extend({
      tableName: 'posts',
      enforcedFilters: () => 'status:published',
      defaultFilters: () => 'type:post',
      extraFilters: () => 'featured:true',
    });

    await assert.rejects(resolveFilterWithSteps(Post, [], { filter: 'featured:false' }), {
      name: 'IncorrectUsageError',
      message:
        "The posts model's filter is resolved by steps, which don't support enforcedFilters, defaultFilters, extraFilters.",
    });
  });

  it('refuses a query that asks for useCTE', async function () {
    const Post = ghostBookshelf.Model.extend({ tableName: 'posts' });

    await assert.rejects(
      resolveFilterWithSteps(Post, [], { filter: 'featured:false', useCTE: true }),
      {
        name: 'IncorrectUsageError',
        message: /useCTE/,
      },
    );
  });
});
