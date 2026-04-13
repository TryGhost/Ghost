const assert = require('node:assert/strict');
const sinon = require('sinon');
const models = require('../../../../core/server/models');
const logging = require('@tryghost/logging');

describe('Unit: models/welcome-email-automation', function () {
    before(function () {
        models.init();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('defaults', function () {
        it('sets default status to inactive', function () {
            const model = new models.WelcomeEmailAutomation();
            const defaults = model.defaults();

            assert.equal(defaults.status, 'inactive');
        });

        it('returns expected default values', function () {
            const model = new models.WelcomeEmailAutomation();
            const defaults = model.defaults();

            assert.ok(defaults);
            assert.equal(Object.keys(defaults).length, 1);
            assert.equal(defaults.status, 'inactive');
        });
    });

    describe('onSaved', function () {
        it('logs when a welcome email is enabled', function () {
            const infoStub = sinon.stub(logging, 'info');
            const model = models.WelcomeEmailAutomation.forge({
                id: 'test-id',
                slug: 'member-welcome-email-free',
                status: 'active'
            });
            sinon.stub(model, 'previous').withArgs('status').returns('inactive');

            model.onSaved(model);

            sinon.assert.calledOnce(infoStub);
            const logArg = infoStub.firstCall.args[0];
            assert.equal(logArg.system.event, 'welcome_email.enabled');
            assert.equal(logArg.system.slug, 'member-welcome-email-free');
        });

        it('logs when a welcome email is disabled', function () {
            const infoStub = sinon.stub(logging, 'info');
            const model = models.WelcomeEmailAutomation.forge({
                id: 'test-id',
                slug: 'member-welcome-email-paid',
                status: 'inactive'
            });
            sinon.stub(model, 'previous').withArgs('status').returns('active');

            model.onSaved(model);

            sinon.assert.calledOnce(infoStub);
            const logArg = infoStub.firstCall.args[0];
            assert.equal(logArg.system.event, 'welcome_email.disabled');
            assert.equal(logArg.system.slug, 'member-welcome-email-paid');
        });

        it('does not log for non-welcome-email slugs', function () {
            const infoStub = sinon.stub(logging, 'info');
            const model = models.WelcomeEmailAutomation.forge({
                id: 'test-id',
                slug: 'some-other-slug',
                status: 'active'
            });
            sinon.stub(model, 'previous').withArgs('status').returns('inactive');

            model.onSaved(model);

            sinon.assert.notCalled(infoStub);
        });

        it('does not log when status has not changed', function () {
            const infoStub = sinon.stub(logging, 'info');
            const model = models.WelcomeEmailAutomation.forge({
                id: 'test-id',
                slug: 'member-welcome-email-free',
                status: 'active'
            });
            sinon.stub(model, 'previous').withArgs('status').returns('active');

            model.onSaved(model);

            sinon.assert.notCalled(infoStub);
        });
    });
});
