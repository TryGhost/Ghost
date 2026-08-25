import GhBillingIframe from 'ghost-admin/components/gh-billing-iframe';
import hbs from 'htmlbars-inline-precompile';
import sinon from 'sinon';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {find, render, settled} from '@ember/test-helpers';
import {setupRenderingTest} from 'ember-mocha';

describe('Integration: Component: gh-billing-iframe dunning state', function () {
    setupRenderingTest();

    let billing;
    let config;
    let notifications;
    let triggerSubscriptionChange;

    async function postBillingData(data) {
        const iframe = find('#billing-frame');
        window.dispatchEvent(new MessageEvent('message', {
            data,
            origin: 'https://billing.example.test',
            source: iframe.contentWindow
        }));
        await settled();
    }

    beforeEach(function () {
        billing = this.owner.lookup('service:billing');
        config = this.owner.lookup('config:main');
        notifications = this.owner.lookup('service:notifications');
        triggerSubscriptionChange = sinon.spy();

        sinon.spy(GhBillingIframe.prototype, '_handleSubscriptionUpdate');
        sinon.stub(GhBillingIframe.prototype, 'stateBridge').get(() => ({triggerSubscriptionChange}));
        sinon.stub(billing, 'getIframeURL').returns('https://billing.example.test/pro');
        sinon.stub(billing, 'startBillingAppLoadMonitor');
        sinon.stub(this.owner.lookup('service:config-manager'), 'fetch').resolves();
        sinon.stub(this.owner.lookup('service:limit'), 'reload');
        sinon.stub(notifications, 'showAlert');
        sinon.stub(notifications, 'closeAlerts');
    });

    afterEach(function () {
        billing.clearBillingAppLoadMonitor();
        sinon.restore();
    });

    it('keeps the overdue banner and forwards an atomic forceUpgrade snapshot', async function () {
        config.hostSettings = {...config.hostSettings, forceUpgrade: true};
        await render(hbs`<GhBillingIframe />`);

        await postBillingData({
            isGrace: true,
            subscription: {status: 'past_due'},
            user: {payment_attempts: 5}
        });

        expect(notifications.showAlert.calledOnce).to.be.true;
        expect(notifications.showAlert.firstCall.args[1]).to.include({
            type: 'error',
            key: 'billing.overdue'
        });
        expect(triggerSubscriptionChange.calledWithMatch({
            isGrace: true,
            subscription: {status: 'past_due'},
            user: {payment_attempts: 5},
            forceUpgrade: true
        })).to.be.true;
    });

    it('closes the overdue banner when Billing reports grace has ended', async function () {
        await render(hbs`<GhBillingIframe />`);

        await postBillingData({
            isGrace: false,
            subscription: {status: 'past_due'}
        });

        expect(notifications.showAlert.called).to.be.false;
        expect(notifications.closeAlerts.calledWith('billing.overdue')).to.be.true;
    });

    it('does not infer dunning from the subscription status', async function () {
        await render(hbs`<GhBillingIframe />`);

        await postBillingData({subscription: {status: 'unpaid'}});

        expect(notifications.showAlert.called).to.be.false;
        expect(notifications.closeAlerts.calledWith('billing.overdue')).to.be.true;
    });
});
