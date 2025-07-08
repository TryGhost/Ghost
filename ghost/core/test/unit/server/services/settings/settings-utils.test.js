const sinon = require('sinon');
const should = require('should');

describe('Unit: services/settings/settings-utils', function () {
    describe('getOrGenerateSiteUuid', function () {
        const config = require('../../../../../core/shared/config');
        const logging = require('@tryghost/logging');
        const {getOrGenerateSiteUuid} = require('../../../../../core/server/services/settings/settings-utils');
        
        let configGetStub;
        let loggingInfoStub;
        let loggingErrorStub;

        beforeEach(function () {
            configGetStub = sinon.stub(config, 'get');
            loggingInfoStub = sinon.stub(logging, 'info');
            loggingErrorStub = sinon.stub(logging, 'error');
            // Reset the cached UUID before each test
            getOrGenerateSiteUuid._reset();
        });

        afterEach(function () {
            sinon.restore();
        });

        it('uses configured UUID when valid UUID is provided', function () {
            const testUuid = '550e8400-e29b-41d4-a716-446655440000';
            configGetStub.withArgs('site_uuid').returns(testUuid);

            const result = getOrGenerateSiteUuid();

            result.should.equal(testUuid.toLowerCase());
            configGetStub.calledOnce.should.be.true();
            loggingInfoStub.calledOnce.should.be.true();
        });

        it('generates new UUID when config value is not a valid UUID', function () {
            configGetStub.withArgs('site_uuid').returns('not-a-valid-uuid');

            const result = getOrGenerateSiteUuid();

            // Should be a valid UUID v4
            result.should.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
            configGetStub.calledOnce.should.be.true();
            loggingInfoStub.calledOnce.should.be.true();
        });

        it('generates new UUID when config value is null', function () {
            configGetStub.withArgs('site_uuid').returns(null);

            const result = getOrGenerateSiteUuid();

            // Should be a valid UUID v4
            result.should.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
            configGetStub.calledOnce.should.be.true();
            loggingInfoStub.calledOnce.should.be.true();
        });

        it('generates new UUID when config value is undefined', function () {
            configGetStub.withArgs('site_uuid').returns(undefined);

            const result = getOrGenerateSiteUuid();

            // Should be a valid UUID v4
            result.should.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
            configGetStub.calledOnce.should.be.true();
            loggingInfoStub.calledOnce.should.be.true();
        });

        it('generates new UUID when config throws an error', function () {
            const testError = new Error('Config error');
            configGetStub.withArgs('site_uuid').throws(testError);

            const result = getOrGenerateSiteUuid();

            // Should be a valid UUID v4
            result.should.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
            configGetStub.calledOnce.should.be.true();
            loggingErrorStub.calledOnce.should.be.true();
        });

        it('converts uppercase UUID to lowercase', function () {
            const testUuid = '550E8400-E29B-41D4-A716-446655440000';
            configGetStub.withArgs('site_uuid').returns(testUuid);

            const result = getOrGenerateSiteUuid();

            result.should.equal(testUuid.toLowerCase());
            result.should.equal('550e8400-e29b-41d4-a716-446655440000');
        });

        it('handles mixed case UUID correctly', function () {
            const testUuid = '550e8400-E29B-41d4-A716-446655440000';
            configGetStub.withArgs('site_uuid').returns(testUuid);

            const result = getOrGenerateSiteUuid();

            result.should.equal(testUuid.toLowerCase());
            result.should.equal('550e8400-e29b-41d4-a716-446655440000');
        });

        it('caches the UUID and returns same value on subsequent calls', function () {
            const testUuid = '550e8400-e29b-41d4-a716-446655440000';
            configGetStub.withArgs('site_uuid').returns(testUuid);

            const result1 = getOrGenerateSiteUuid();
            const result2 = getOrGenerateSiteUuid();

            result1.should.equal(result2);
            result1.should.equal(testUuid.toLowerCase());
            // Config should only be called once due to caching
            configGetStub.calledOnce.should.be.true();
        });
    });
});