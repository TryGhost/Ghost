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
});
