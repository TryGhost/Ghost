import GhBillingIframe from 'ghost-admin/components/gh-billing-iframe';
import hbs from 'htmlbars-inline-precompile';
import sinon from 'sinon';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {find, render, settled} from '@ember/test-helpers';
import {setupRenderingTest} from 'ember-mocha';

describe('Integration: Component: gh-billing-iframe', function () {
    setupRenderingTest();

    let billing;

    async function postBillingMessage(data, options = {}) {
        const iframe = find('#billing-frame');

        window.dispatchEvent(new MessageEvent('message', {
            data,
            origin: options.origin ?? 'https://billing.example.test',
            source: options.source ?? iframe.contentWindow
        }));

        await settled();
    }

    beforeEach(function () {
        billing = this.owner.lookup('service:billing');

        sinon.stub(billing, 'getIframeURL').returns('https://billing.example.test/pro');
        sinon.stub(billing, 'startBillingAppLoadMonitor');
    });

    afterEach(function () {
        billing.clearBillingAppLoadMonitor();
        sinon.restore();
    });

    it('marks the billing app loaded after billingAppReady from the validated iframe', async function () {
        const markBillingAppLoaded = sinon.spy(billing, 'markBillingAppLoaded');

        await render(hbs`<GhBillingIframe />`);

        await postBillingMessage({
            request: 'billingAppReady',
            route: '/plans',
            state: 'content',
            release: 'test',
            timestamp: Date.now()
        });

        expect(markBillingAppLoaded.calledOnce).to.be.true;
        expect(markBillingAppLoaded.firstCall.args[0]).to.include({
            request: 'billingAppReady',
            route: '/plans',
            state: 'content',
            release: 'test'
        });
        expect(billing.billingAppLoaded).to.be.true;
    });

    it('handles valid non-ready token messages without marking the billing app loaded', async function () {
        const markBillingAppLoaded = sinon.spy(billing, 'markBillingAppLoaded');

        await render(hbs`<GhBillingIframe />`);

        const postMessage = sinon.stub(GhBillingIframe.prototype, '_postMessageToBillingIframe');

        await postBillingMessage({request: 'token'});

        expect(markBillingAppLoaded.called).to.be.false;
        expect(billing.billingAppLoaded).to.be.false;
        expect(postMessage.calledOnceWithExactly({
            request: 'token',
            response: null
        })).to.be.true;
    });

    it('responds with force upgrade and owner information', async function () {
        const postMessage = sinon.stub(GhBillingIframe.prototype, '_postMessageToBillingIframe');
        const config = this.owner.lookup('config:main');
        config.hostSettings = {...config.hostSettings, forceUpgrade: true};
        billing.ownerUser = {name: 'Site Owner', email: 'owner@example.com'};

        await render(hbs`<GhBillingIframe />`);
        await postBillingMessage({request: 'forceUpgradeInfo'});

        expect(postMessage.calledOnceWithExactly({
            request: 'forceUpgradeInfo',
            response: {
                forceUpgrade: true,
                isOwner: null,
                ownerUser: {name: 'Site Owner', email: 'owner@example.com'}
            }
        })).to.be.true;
    });

    it('handles valid route messages without marking the billing app loaded', async function () {
        const markBillingAppLoaded = sinon.spy(billing, 'markBillingAppLoaded');
        const handleRouteChangeInIframe = sinon.spy(billing, 'handleRouteChangeInIframe');

        await render(hbs`<GhBillingIframe />`);

        await postBillingMessage({route: '/plans'});

        expect(markBillingAppLoaded.called).to.be.false;
        expect(handleRouteChangeInIframe.calledOnceWithExactly('/plans')).to.be.true;
        expect(billing.billingAppLoaded).to.be.false;
    });

    it('ignores messages from an invalid origin', async function () {
        const markBillingAppLoaded = sinon.spy(billing, 'markBillingAppLoaded');

        await render(hbs`<GhBillingIframe />`);

        const postMessage = sinon.stub(GhBillingIframe.prototype, '_postMessageToBillingIframe');

        await postBillingMessage({request: 'token'}, {origin: 'https://evil.example.test'});
        await postBillingMessage({request: 'billingAppReady'}, {origin: 'https://evil.example.test'});

        expect(markBillingAppLoaded.called).to.be.false;
        expect(postMessage.called).to.be.false;
        expect(billing.billingAppLoaded).to.be.false;
    });

    it('ignores messages from the wrong source window', async function () {
        const markBillingAppLoaded = sinon.spy(billing, 'markBillingAppLoaded');

        await render(hbs`<GhBillingIframe />`);

        await postBillingMessage({request: 'billingAppReady'}, {source: window});

        expect(markBillingAppLoaded.called).to.be.false;
        expect(billing.billingAppLoaded).to.be.false;
    });

    it('ignores messages when the billing iframe window is unavailable', async function () {
        const markBillingAppLoaded = sinon.spy(billing, 'markBillingAppLoaded');

        await render(hbs`<GhBillingIframe />`);

        sinon.stub(billing, 'getBillingIframe').returns(null);

        await postBillingMessage({request: 'billingAppReady'}, {source: window});

        expect(markBillingAppLoaded.called).to.be.false;
        expect(billing.billingAppLoaded).to.be.false;
    });

    it('links exceeded member limits to plans without a checkout route and clears the alert on recovery', async function () {
        sinon.stub(this.owner.lookup('service:config-manager'), 'fetch').resolves();
        sinon.stub(this.owner.lookup('service:limit'), 'reload');
        const notifications = this.owner.lookup('service:notifications');
        const showAlert = sinon.stub(notifications, 'showAlert');
        const closeAlerts = sinon.stub(notifications, 'closeAlerts');
        const subscription = {status: 'active'};

        await render(hbs`<GhBillingIframe />`);
        await postBillingMessage({subscription, exceededLimits: ['members']});

        expect(showAlert.calledOnce).to.be.true;
        expect(showAlert.firstCall.args[0].toString()).to.equal('Your audience has grown! To continue publishing, the site owner must <a href="#/pro/plans">confirm pricing for this number of members</a>.');
        expect(showAlert.firstCall.args[1]).to.deep.equal({type: 'warn', key: 'billing.exceeded'});
        expect(closeAlerts.called).to.be.false;

        await postBillingMessage({subscription, exceededLimits: []});

        expect(showAlert.calledOnce).to.be.true;
        expect(closeAlerts.calledOnceWithExactly('billing.exceeded')).to.be.true;
    });

    describe('exceeded member limits during dunning', function () {
        const paymentFailedAt = '2026-09-01T00:00:00.000Z';
        let showAlert;
        let closeAlerts;

        beforeEach(function () {
            sinon.stub(this.owner.lookup('service:config-manager'), 'fetch').resolves();
            sinon.stub(this.owner.lookup('service:limit'), 'reload');
            const notifications = this.owner.lookup('service:notifications');
            showAlert = sinon.stub(notifications, 'showAlert');
            closeAlerts = sinon.stub(notifications, 'closeAlerts');
            const config = this.owner.lookup('config:main');
            config.hostSettings = {
                ...config.hostSettings,
                billing: {dunning: {active: true, paymentFailedAt, suspendsAt: '2026-09-29T00:00:00.000Z'}}
            };
        });

        afterEach(function () {
            window.sessionStorage.clear();
        });

        it('holds the alert until the payment is made', async function () {
            await render(hbs`<GhBillingIframe />`);
            await postBillingMessage({subscription: {status: 'past_due'}, exceededLimits: ['members']});

            expect(showAlert.called).to.be.false;
            expect(closeAlerts.calledOnceWithExactly('billing.exceeded')).to.be.true;

            await postBillingMessage({subscription: {status: 'active'}, exceededLimits: ['members']});

            expect(showAlert.calledOnce).to.be.true;
            expect(showAlert.firstCall.args[1]).to.deep.equal({type: 'warn', key: 'billing.exceeded'});
        });

        it('shows the alert once this session settled the failure', async function () {
            window.sessionStorage.setItem('ghost-dunning-payment-settled-for', paymentFailedAt);

            await render(hbs`<GhBillingIframe />`);
            await postBillingMessage({subscription: {status: 'past_due'}, exceededLimits: ['members']});

            expect(showAlert.calledOnce).to.be.true;
        });
    });

    const approvedDestinations = {
        theme: '/settings/design/change-theme',
        analytics: '/settings/analytics',
        staff: '/settings/staff',
        stripe: '/settings/stripe-connect',
        integrations: '/settings/integrations'
    };

    Object.entries(approvedDestinations).forEach(([destination, route]) => {
        it(`navigates to ${route} for a validated navigateToAdmin '${destination}' message`, async function () {
            const router = this.owner.lookup('service:router');
            const transitionTo = sinon.stub(router, 'transitionTo');

            await render(hbs`<GhBillingIframe />`);

            await postBillingMessage({request: 'navigateToAdmin', destination});

            expect(transitionTo.calledOnceWithExactly(route)).to.be.true;
        });
    });

    it('navigates newsletters to the emails route when the automations flag is enabled', async function () {
        const router = this.owner.lookup('service:router');
        const transitionTo = sinon.stub(router, 'transitionTo');
        const feature = this.owner.lookup('service:feature');
        sinon.stub(feature, 'automations').get(() => true);

        await render(hbs`<GhBillingIframe />`);

        await postBillingMessage({request: 'navigateToAdmin', destination: 'newsletters'});

        expect(transitionTo.calledOnceWithExactly('/settings/emails')).to.be.true;
    });

    it('navigates newsletters to the newsletters route when the automations flag is disabled', async function () {
        const router = this.owner.lookup('service:router');
        const transitionTo = sinon.stub(router, 'transitionTo');
        const feature = this.owner.lookup('service:feature');
        sinon.stub(feature, 'automations').get(() => false);

        await render(hbs`<GhBillingIframe />`);

        await postBillingMessage({request: 'navigateToAdmin', destination: 'newsletters'});

        expect(transitionTo.calledOnceWithExactly('/settings/newsletters')).to.be.true;
    });

    it('ignores a navigateToAdmin message with an unknown destination', async function () {
        const router = this.owner.lookup('service:router');
        const transitionTo = sinon.stub(router, 'transitionTo');

        await render(hbs`<GhBillingIframe />`);

        await postBillingMessage({request: 'navigateToAdmin', destination: 'dashboard'});

        expect(transitionTo.called).to.be.false;
    });

    it('ignores a navigateToAdmin message with a missing destination', async function () {
        const router = this.owner.lookup('service:router');
        const transitionTo = sinon.stub(router, 'transitionTo');

        await render(hbs`<GhBillingIframe />`);

        await postBillingMessage({request: 'navigateToAdmin'});

        expect(transitionTo.called).to.be.false;
    });

    it('ignores a navigateToAdmin message with a non-string destination', async function () {
        const router = this.owner.lookup('service:router');
        const transitionTo = sinon.stub(router, 'transitionTo');

        await render(hbs`<GhBillingIframe />`);

        await postBillingMessage({request: 'navigateToAdmin', destination: {route: '/settings/staff'}});

        expect(transitionTo.called).to.be.false;
    });

    it('ignores a navigateToAdmin message from an invalid origin', async function () {
        const router = this.owner.lookup('service:router');
        const transitionTo = sinon.stub(router, 'transitionTo');

        await render(hbs`<GhBillingIframe />`);

        await postBillingMessage(
            {request: 'navigateToAdmin', destination: 'analytics'},
            {origin: 'https://evil.example.test'}
        );

        expect(transitionTo.called).to.be.false;
    });

    it('ignores a navigateToAdmin message from the wrong source window', async function () {
        const router = this.owner.lookup('service:router');
        const transitionTo = sinon.stub(router, 'transitionTo');

        await render(hbs`<GhBillingIframe />`);

        await postBillingMessage(
            {request: 'navigateToAdmin', destination: 'analytics'},
            {source: window}
        );

        expect(transitionTo.called).to.be.false;
    });
});
