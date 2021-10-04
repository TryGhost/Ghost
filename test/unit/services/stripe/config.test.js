const should = require('should');
const sinon = require('sinon');

const {getConfig} = require('../../../../core/server/services/stripe/config');

describe('Stripe - config', function () {
    it('Uses direct keys when stripeDirect is true, regardles of which keys exist', function () {
        const fakeSettings = {
            get: sinon.stub()
        };
        const fakeConfig = {
            get: sinon.stub()
        };

        fakeSettings.get.withArgs('stripe_connect_secret_key').returns('connect_secret');
        fakeSettings.get.withArgs('stripe_connect_publishable_key').returns('connect_publishable');
        fakeSettings.get.withArgs('stripe_secret_key').returns('direct_secret');
        fakeSettings.get.withArgs('stripe_publishable_key').returns('direct_publishable');
        fakeConfig.get.withArgs('stripeDirect').returns(true);

        const config = getConfig(fakeSettings, fakeConfig);

        should.equal(config.publicKey, 'direct_publishable');
        should.equal(config.secretKey, 'direct_secret');
    });

    it('Does not use connect keys if stripeDirect is true, and the direct keys do not exist', function () {
        const fakeSettings = {
            get: sinon.stub()
        };
        const fakeConfig = {
            get: sinon.stub()
        };

        fakeSettings.get.withArgs('stripe_connect_secret_key').returns('connect_secret');
        fakeSettings.get.withArgs('stripe_connect_publishable_key').returns('connect_publishable');
        fakeSettings.get.withArgs('stripe_secret_key').returns(null);
        fakeSettings.get.withArgs('stripe_publishable_key').returns(null);
        fakeConfig.get.withArgs('stripeDirect').returns(true);

        const config = getConfig(fakeSettings, fakeConfig);

        should.equal(config, null);
    });

    it('Uses connect keys when stripeDirect is false, and the connect keys exist', function () {
        const fakeSettings = {
            get: sinon.stub()
        };
        const fakeConfig = {
            get: sinon.stub()
        };

        fakeSettings.get.withArgs('stripe_connect_secret_key').returns('connect_secret');
        fakeSettings.get.withArgs('stripe_connect_publishable_key').returns('connect_publishable');
        fakeSettings.get.withArgs('stripe_secret_key').returns('direct_secret');
        fakeSettings.get.withArgs('stripe_publishable_key').returns('direct_publishable');
        fakeConfig.get.withArgs('stripeDirect').returns(false);

        const config = getConfig(fakeSettings, fakeConfig);

        should.equal(config.publicKey, 'connect_publishable');
        should.equal(config.secretKey, 'connect_secret');
    });

    it('Uses direct keys when stripeDirect is false, but the connect keys do not exist', function () {
        const fakeSettings = {
            get: sinon.stub()
        };
        const fakeConfig = {
            get: sinon.stub()
        };

        fakeSettings.get.withArgs('stripe_connect_secret_key').returns(null);
        fakeSettings.get.withArgs('stripe_connect_publishable_key').returns(null);
        fakeSettings.get.withArgs('stripe_secret_key').returns('direct_secret');
        fakeSettings.get.withArgs('stripe_publishable_key').returns('direct_publishable');
        fakeConfig.get.withArgs('stripeDirect').returns(false);

        const config = getConfig(fakeSettings, fakeConfig);

        should.equal(config.publicKey, 'direct_publishable');
        should.equal(config.secretKey, 'direct_secret');
    });
});
