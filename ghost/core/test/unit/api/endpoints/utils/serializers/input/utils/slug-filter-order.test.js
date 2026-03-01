const assert = require('node:assert/strict');
const slugFilterOrder = require('../../../../../../../../core/server/api/endpoints/utils/serializers/input/utils/slug-filter-order');

describe('Unit: endpoints/utils/serializers/input/utils/slug-filter-order', function () {
    it('returns parameterized sql and bindings for slug filter', function () {
        const result = slugFilterOrder('tags', 'slug:[kitchen-sink,bacon,chorizo]');

        assert.equal(result.sql, 'CASE WHEN `tags`.`slug` = ? THEN ? WHEN `tags`.`slug` = ? THEN ? WHEN `tags`.`slug` = ? THEN ? END ASC');
        assert.deepEqual(result.bindings, ['kitchen-sink', 0, 'bacon', 1, 'chorizo', 2]);
    });

    it('returns undefined when filter has no slug array', function () {
        const result = slugFilterOrder('tags', 'status:published');

        assert.equal(result, undefined);
    });

    it('trims whitespace from slug values', function () {
        const result = slugFilterOrder('posts', 'slug:[ foo , bar ]');

        assert.deepEqual(result.bindings, ['foo', 0, 'bar', 1]);
    });

    it('handles single slug', function () {
        const result = slugFilterOrder('posts', 'slug:[only-one]');

        assert.equal(result.sql, 'CASE WHEN `posts`.`slug` = ? THEN ? END ASC');
        assert.deepEqual(result.bindings, ['only-one', 0]);
    });
});
