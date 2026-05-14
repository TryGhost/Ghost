import hbs from 'htmlbars-inline-precompile';
import sinon from 'sinon';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {find, render, settled} from '@ember/test-helpers';
import {setupRenderingTest} from 'ember-mocha';

describe('Integration: Component: gh-billing-modal', function () {
    setupRenderingTest();

    let billing;

    beforeEach(function () {
        billing = this.owner.lookup('service:billing');
        billing.billingAppLoaded = false;
        billing.billingAppLoadFailureReported = false;

        sinon.stub(billing, 'getIframeURL').returns('https://billing.example.test');
        sinon.stub(billing, 'startBillingAppLoadMonitor');
    });

    afterEach(function () {
        billing.clearBillingAppLoadMonitor();
        sinon.restore();
    });

    it('shows a loading state until the billing app sends its first message', async function () {
        await render(hbs`<GhBillingModal @billingWindowOpen={{true}} />`);

        expect(find('[data-test-billing-loading]')).to.exist;
        expect(find('[data-test-billing-load-error]')).to.not.exist;

        billing.markBillingAppLoaded();
        await settled();

        expect(find('[data-test-billing-loading]')).to.not.exist;
        expect(find('[data-test-billing-load-error]')).to.not.exist;
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
