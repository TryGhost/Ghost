import hbs from 'htmlbars-inline-precompile';
import sinon from 'sinon';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {find, render, settled} from '@ember/test-helpers';
import {setupRenderingTest} from 'ember-mocha';

describe('Integration: Component: gh-billing-modal', function () {
    setupRenderingTest();

    let billing;
    let configManager;
    let limit;
    let stateBridge;

    async function postBillingMessage(data) {
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
        configManager = this.owner.lookup('service:config-manager');
        limit = this.owner.lookup('service:limit');
        stateBridge = this.owner.lookup('service:state-bridge');

        billing.billingAppLoaded = false;
        billing.billingAppLoadFailureReported = false;

        sinon.stub(billing, 'getIframeURL').returns('https://billing.example.test');
        sinon.stub(billing, 'startBillingAppLoadMonitor');
        sinon.stub(configManager, 'fetch').resolves();
        sinon.stub(limit, 'reload');
        sinon.stub(stateBridge, 'triggerSubscriptionChange');
    });

    afterEach(function () {
        billing.clearBillingAppLoadMonitor();
        sinon.restore();
    });

    it('shows a loading state until the billing app sends billingAppReady', async function () {
        await render(hbs`<GhBillingModal @billingWindowOpen={{true}} />`);

        expect(find('[data-test-billing-loading]')).to.exist;
        expect(find('[data-test-billing-load-error]')).to.not.exist;

        await postBillingMessage({
            request: 'billingAppReady',
            route: '/plans',
            state: 'loading',
            release: 'test',
            timestamp: Date.now()
        });

        expect(find('[data-test-billing-loading]')).to.not.exist;
        expect(find('[data-test-billing-load-error]')).to.not.exist;
    });

    it('keeps the loading state for valid non-ready billing app messages', async function () {
        await render(hbs`<GhBillingModal @billingWindowOpen={{true}} />`);

        await postBillingMessage({request: 'token'});
        expect(find('[data-test-billing-loading]')).to.exist;

        await postBillingMessage({request: 'forceUpgradeInfo'});
        expect(find('[data-test-billing-loading]')).to.exist;

        await postBillingMessage({route: '/plans'});
        expect(find('[data-test-billing-loading]')).to.exist;

        await postBillingMessage({
            subscription: {
                status: 'active'
            }
        });
        expect(find('[data-test-billing-loading]')).to.exist;

        await postBillingMessage({
            request: 'billingAppReady',
            state: 'content'
        });
        expect(find('[data-test-billing-loading]')).to.not.exist;
    });

    it('shows a customer-facing error when the billing app does not become ready', async function () {
        billing.billingAppLoadFailureReported = true;

        await render(hbs`<GhBillingModal @billingWindowOpen={{true}} />`);

        expect(find('[data-test-billing-loading]')).to.not.exist;
        expect(find('[data-test-billing-load-error]')).to.exist;
        expect(find('[data-test-billing-load-error-title]').textContent.trim()).to.equal('We couldn\'t load your Ghost(Pro) settings');
        expect(find('[data-test-billing-load-error-description]').textContent.trim()).to.equal('Refresh the page and try again. If the issue continues, contact support@ghost.org.');
        expect(find('[data-test-billing-load-error-description] a')).to.have.attribute('href', 'mailto:support@ghost.org');
    });

    it('keeps showing the loading state for hidden preload diagnostics', async function () {
        billing.billingAppPreloadFailure = {
            attemptId: 'preload-attempt'
        };

        await render(hbs`<GhBillingModal @billingWindowOpen={{true}} />`);

        expect(find('[data-test-billing-loading]')).to.exist;
        expect(find('[data-test-billing-load-error]')).to.not.exist;
    });

    it('clears a reported error when the billing app sends a late message', async function () {
        billing.billingAppLoadFailureReported = true;

        await render(hbs`<GhBillingModal @billingWindowOpen={{true}} />`);

        expect(find('[data-test-billing-load-error]')).to.exist;

        billing.markBillingAppLoaded();
        await settled();

        expect(find('[data-test-billing-load-error]')).to.not.exist;
    });

    it('does not show loading or error states when the billing window is closed', async function () {
        await render(hbs`<GhBillingModal @billingWindowOpen={{false}} />`);

        expect(find('[data-test-billing-loading]')).to.not.exist;
        expect(find('[data-test-billing-load-error]')).to.not.exist;
    });
});
