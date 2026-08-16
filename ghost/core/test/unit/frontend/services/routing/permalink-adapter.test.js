const assert = require('node:assert/strict');
const {toExpressNotation} = require('../../../../../core/frontend/services/routing/permalink-adapter');

describe('UNIT - services/routing/permalink-adapter', function () {
    describe('toExpressNotation', function () {
        it('converts a single {slug} placeholder to :slug', function () {
            assert.equal(toExpressNotation('/{slug}/'), '/:slug/');
        });

        it('converts every placeholder in a multi-segment permalink', function () {
            assert.equal(toExpressNotation('/{primary_tag}/{slug}/'), '/:primary_tag/:slug/');
        });

        it('handles date-style permalinks', function () {
            assert.equal(toExpressNotation('/{year}/{month}/{slug}/'), '/:year/:month/:slug/');
        });

        it('converts placeholders adjacent to non-slash separators', function () {
            assert.equal(toExpressNotation('/{year}-{month}-{day}-{slug}/'), '/:year-:month-:day-:slug/');
        });

        it('leaves a permalink with no placeholder untouched', function () {
            assert.equal(toExpressNotation('/about/'), '/about/');
        });

        it('is idempotent — already-converted :slug notation is unchanged', function () {
            assert.equal(toExpressNotation('/:slug/'), '/:slug/');
            assert.equal(toExpressNotation('/:primary_tag/:slug/'), '/:primary_tag/:slug/');
        });
    });
});
