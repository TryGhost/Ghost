const should = require('should');
const mapper = require('../../../../../../../../core/server/api/shared/serializers/input/utils/settings-filter-type-group-mapper');

describe('Unit: canary/utils/serializers/input/utils/settings-type-group-mapper', function () {
    describe('browse', function () {
        it('maps type to group 1:1', function () {
            mapper('theme').should.eql('theme');
        });

        it('maps type to multiple groups', function () {
            mapper('blog').should.eql('site,amp,labs,slack,unsplash,views');
        });

        it('maps multiple types to multiple groups', function () {
            mapper('bulk_email,portal').should.eql('email,portal');
        });

        it('skips unknown options for "bulk_email,unknown,portal" type to "bulk_email,portal', function () {
            mapper('bulk_email,unknown,portal').should.eql('email,portal');
        });

        it('handles unexpected spacing', function () {
            mapper(' bulk_email, portal ').should.eql('email,portal');
        });
    });
});
