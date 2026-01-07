import assert from 'assert/strict';
import sinon from 'sinon';
import {EmailAddressService} from '../../../../../core/server/services/email-address/EmailAddressService.js';

describe('EmailAddressService', function () {
    let labsStub: any;

    beforeEach(function () {
        labsStub = {
            isSet: sinon.stub()
        };
    });

    afterEach(function () {
        sinon.restore();
    });

    // Helper to create service config with overrides
    const createConfig = (overrides: any = {}) => ({
        getManagedEmailEnabled: () => true,
        getSendingDomain: () => 'custom.example.com',
        getFallbackDomain: () => 'fallback.example.com',
        getDefaultEmail: () => ({address: 'noreply@ghost.org', name: 'Ghost'}),
        getFallbackEmail: () => 'fallback@fallback.example.com',
        isValidEmailAddress: () => true,
        labs: labsStub,
        ...overrides
    });

    // Helper to create service instance
    const createService = (configOverrides: any = {}) => {
        return new EmailAddressService(createConfig(configOverrides));
    };

    describe('getAddress with fallback domain', function () {
        it('uses fallback address when domainWarmup flag is enabled and useFallbackAddress is true', function () {
            labsStub.isSet.withArgs('domainWarmup').returns(true);
            const service = createService();

            const result = service.getAddress({
                from: {address: 'custom@custom.example.com', name: 'Custom Sender'}
            }, {useFallbackAddress: true});

            assert.equal(result.from.address, 'fallback@fallback.example.com');
            assert.equal(result.from.name, 'Custom Sender');
            assert.equal(result.replyTo?.address, 'custom@custom.example.com');
            assert.equal(result.replyTo?.name, 'Custom Sender');
        });

        it('does not use fallback address when useFallbackAddress is false', function () {
            labsStub.isSet.withArgs('domainWarmup').returns(true);
            const service = createService();

            const result = service.getAddress({
                from: {address: 'custom@custom.example.com', name: 'Custom Sender'}
            }, {useFallbackAddress: false});

            assert.equal(result.from.address, 'custom@custom.example.com');
            assert.equal(result.from.name, 'Custom Sender');
            assert.equal(result.replyTo, undefined);
        });

        it('does not use fallback address when domainWarmup flag is disabled', function () {
            labsStub.isSet.withArgs('domainWarmup').returns(false);
            const service = createService();

            const result = service.getAddress({
                from: {address: 'custom@custom.example.com', name: 'Custom Sender'}
            }, {useFallbackAddress: true});

            // Should use the original address when flag is disabled
            assert.equal(result.from.address, 'custom@custom.example.com');
            assert.equal(result.from.name, 'Custom Sender');
            assert.equal(result.replyTo, undefined);
        });

        it('does not use fallback address when fallback email is not configured', function () {
            labsStub.isSet.withArgs('domainWarmup').returns(true);
            const service = createService({
                getFallbackEmail: () => null
            });

            const result = service.getAddress({
                from: {address: 'custom@custom.example.com', name: 'Custom Sender'}
            }, {useFallbackAddress: true});

            // Should fall back to normal behavior when fallback not configured
            assert.equal(result.from.address, 'custom@custom.example.com');
            assert.equal(result.from.name, 'Custom Sender');
            assert.equal(result.replyTo, undefined);
        });

        it('preserves existing replyTo when using fallback address', function () {
            labsStub.isSet.withArgs('domainWarmup').returns(true);
            const service = createService();

            const result = service.getAddress({
                from: {address: 'custom@custom.example.com', name: 'Custom Sender'},
                replyTo: {address: 'support@custom.example.com', name: 'Support'}
            }, {useFallbackAddress: true});

            assert.equal(result.from.address, 'fallback@fallback.example.com');
            assert.equal(result.from.name, 'Custom Sender');
            assert.equal(result.replyTo?.address, 'support@custom.example.com');
            assert.equal(result.replyTo?.name, 'Support');
        });

        it('sets fallback from name to default email name when preferred from has no name', function () {
            labsStub.isSet.withArgs('domainWarmup').returns(true);
            const service = createService();

            const result = service.getAddress({
                from: {address: 'custom@custom.example.com'}
            }, {useFallbackAddress: true});

            assert.equal(result.from.address, 'fallback@fallback.example.com');
            assert.equal(result.from.name, 'Ghost');
            assert.equal(result.replyTo?.address, 'custom@custom.example.com');
        });

        it('preserves fallback email name when already set', function () {
            labsStub.isSet.withArgs('domainWarmup').returns(true);
            const service = createService({
                getFallbackEmail: () => '"Fallback Sender" <fallback@fallback.example.com>'
            });

            const result = service.getAddress({
                from: {address: 'custom@custom.example.com', name: 'Custom Sender'}
            }, {useFallbackAddress: true});

            assert.equal(result.from.address, 'fallback@fallback.example.com');
            assert.equal(result.from.name, 'Fallback Sender');
            assert.equal(result.replyTo?.address, 'custom@custom.example.com');
            assert.equal(result.replyTo?.name, 'Custom Sender');
        });
    });

    describe('fallbackDomain getter', function () {
        it('returns the fallback domain', function () {
            const service = createService();

            assert.equal(service.fallbackDomain, 'fallback.example.com');
        });

        it('returns null when not configured', function () {
            const service = createService({
                getFallbackDomain: () => null
            });

            assert.equal(service.fallbackDomain, null);
        });
    });

    describe('fallbackEmail getter', function () {
        it('returns the parsed fallback email', function () {
            const service = createService({
                getFallbackEmail: () => '"Fallback" <fallback@fallback.example.com>'
            });

            assert.equal(service.fallbackEmail?.address, 'fallback@fallback.example.com');
            assert.equal(service.fallbackEmail?.name, 'Fallback');
        });

        it('returns null when not configured', function () {
            const service = createService({
                getFallbackEmail: () => null
            });

            assert.equal(service.fallbackEmail, null);
        });
    });
});
