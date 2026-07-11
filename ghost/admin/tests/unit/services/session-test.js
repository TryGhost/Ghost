import sinon from 'sinon';
import {afterEach, beforeEach, describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Service: session', function () {
    setupTest();

    let service, configManager;

    beforeEach(function () {
        service = this.owner.lookup('service:session');
        configManager = this.owner.lookup('service:config-manager');

        // Collaborators that hit the network/router are stubbed — these tests
        // only assert the post-auth orchestration around config loading.
        sinon.stub(service, 'postAuthPreparation').resolves();
        sinon.stub(service, 'populateUser').resolves();
        sinon.stub(service, 'invalidate').resolves();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('#handleAuthenticationTask', function () {
        it('populates the user and runs postAuthPreparation when no user is loaded', async function () {
            service.user = null;

            const callback = sinon.spy();
            await service.handleAuthenticationTask.perform(callback);

            expect(service.populateUser.calledOnce, 'populateUser').to.be.true;
            expect(service.postAuthPreparation.calledOnce, 'postAuthPreparation').to.be.true;
            expect(callback.calledOnce, 'callback').to.be.true;
        });

        it('runs postAuthPreparation when the user is set but config has not loaded', async function () {
            // e.g. `setup()` restored the session (populating `this.user`) before
            // authentication was handled here, so boot-time prep never ran
            service.user = {id: 'me'};
            configManager.isConfigLoaded = false;

            const callback = sinon.spy();
            await service.handleAuthenticationTask.perform(callback);

            expect(service.populateUser.called, 'populateUser').to.be.false;
            expect(service.postAuthPreparation.calledOnce, 'postAuthPreparation').to.be.true;
            expect(callback.calledOnce, 'callback').to.be.true;
        });

        it('skips postAuthPreparation when the user is set and config has already loaded', async function () {
            service.user = {id: 'me'};
            configManager.isConfigLoaded = true;

            const callback = sinon.spy();
            await service.handleAuthenticationTask.perform(callback);

            expect(service.postAuthPreparation.called, 'postAuthPreparation').to.be.false;
            expect(callback.calledOnce, 'callback').to.be.true;
        });

        it('still runs the callback when prep fails during repair', async function () {
            service.user = {id: 'me'};
            configManager.isConfigLoaded = false;
            service.postAuthPreparation.rejects(new Error('boom'));

            const callback = sinon.spy();
            await service.handleAuthenticationTask.perform(callback);

            expect(service.postAuthPreparation.calledOnce, 'postAuthPreparation').to.be.true;
            expect(callback.calledOnce, 'callback').to.be.true;
        });
    });

    describe('#requireAuthentication', function () {
        let transition;

        beforeEach(function () {
            // ESA's requireAuthentication asserts setup() was called
            service._setupIsCalled = true;
            sinon.stub(service.notifications, 'clearAll');
            transition = {abort: sinon.spy(), retry: sinon.spy()};
        });

        it('runs postAuthPreparation when re-authenticating with config unloaded', async function () {
            service.user = {id: 'me'};
            configManager.isConfigLoaded = false;

            let authenticated = false;
            sinon.stub(service, 'isAuthenticated').get(() => authenticated);
            sinon.stub(service, 'setup').callsFake(async () => {
                authenticated = true;
            });

            await service.requireAuthentication(transition, () => {});

            expect(service.setup.calledOnce, 'setup').to.be.true;
            expect(service.postAuthPreparation.calledOnce, 'postAuthPreparation').to.be.true;
            expect(transition.retry.calledOnce, 'retry').to.be.true;
        });

        it('does not run postAuthPreparation when config is already loaded', async function () {
            service.user = {id: 'me'};
            configManager.isConfigLoaded = true;

            let authenticated = false;
            sinon.stub(service, 'isAuthenticated').get(() => authenticated);
            sinon.stub(service, 'setup').callsFake(async () => {
                authenticated = true;
            });

            await service.requireAuthentication(transition, () => {});

            expect(service.postAuthPreparation.called, 'postAuthPreparation').to.be.false;
            expect(transition.retry.calledOnce, 'retry').to.be.true;
        });

        it('does not re-setup when there is no in-memory user', async function () {
            service.user = null;
            sinon.stub(service, 'isAuthenticated').get(() => false);
            sinon.stub(service, 'setup').resolves();

            await service.requireAuthentication(transition, () => {});

            expect(service.setup.called, 'setup').to.be.false;
            expect(service.postAuthPreparation.called, 'postAuthPreparation').to.be.false;
            expect(transition.retry.called, 'retry').to.be.false;
        });
    });
});
