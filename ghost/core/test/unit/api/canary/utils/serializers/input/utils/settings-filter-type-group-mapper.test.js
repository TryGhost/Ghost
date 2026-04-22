const assert = require('node:assert/strict');
const mapper = require('../../../../../../../../core/server/api/endpoints/utils/serializers/input/utils/settings-filter-type-group-mapper');

describe('Unit: endpoints/utils/serializers/input/utils/settings-type-group-mapper', function () {
    describe('browse', function () {
        it('maps type to group 1:1', function () {
            assert.equal(mapper('theme'), 'theme');
        });

        it('maps type to multiple groups', function () {
            assert.equal(mapper('blog'), 'site,labs,slack,unsplash,views');
        });

        it('maps multiple types to multiple groups', function () {
            assert.equal(mapper('bulk_email,portal'), 'email,portal');
        });

        it('skips unknown options for "bulk_email,unknown,portal" type to "bulk_email,portal', function () {
            assert.equal(mapper('bulk_email,unknown,portal'), 'email,portal');
        });

        it('handles unexpected spacing', function () {
            assert.equal(mapper(' bulk_email, portal '), 'email,portal');
        });
    });
});