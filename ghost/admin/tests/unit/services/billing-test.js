import * as Sentry from '@sentry/ember';
import sentryTestKit from 'sentry-testkit/browser';
import sinon from 'sinon';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {getSentryTestConfig} from 'ghost-admin/utils/sentry';
import {setupTest} from 'ember-mocha';
import {waitUntil} from '@ember/test-helpers';

const {sentryTransport, testkit} = sentryTestKit();

describe('Unit: Service: billing', function () {
    setupTest();

    let billingService;

    before(function () {
        Sentry.init(getSentryTestConfig(sentryTransport));
    });

    beforeEach(function () {
        testkit.reset();

        const config = this.owner.lookup('config:main');
        config.sentry_dsn = 'https://example.com/sentry';
        config.hostSettings = {
            billing: {
                url: 'https://billing.example.test'
            }
        };
    });

    afterEach(function () {
        billingService?.clearBillingAppLoadMonitor();
        billingService = null;
        sinon.restore();
    });

    it('retries loading the billing app before reporting', async function () {
        const service = this.owner.lookup('service:billing');
        billingService = service;
        service.billingAppLoadTimeoutMs = 1;
        service.billingAppLoadRetryDelaysMs = [1];
        const reloadBillingIframe = sinon.stub(service, 'reloadBillingIframe');
        const reportBillingAppLoadFailure = sinon.stub(service, 'reportBillingAppLoadFailure');

        service.startBillingAppLoadMonitor();

        await waitUntil(() => reportBillingAppLoadFailure.called);

        expect(reloadBillingIframe.calledOnce).to.be.true;
        expect(reportBillingAppLoadFailure.calledOnce).to.be.true;
        expect(reloadBillingIframe.calledBefore(reportBillingAppLoadFailure)).to.be.true;
    });

    it('re-arms the monitor after the billing app became ready', async function () {
        const service = this.owner.lookup('service:billing');
        billingService = service;
        service.billingAppLoadTimeoutMs = 1;
        service.billingAppLoadRetryDelaysMs = [];
        const reportBillingAppLoadFailure = sinon.stub(service, 'reportBillingAppLoadFailure');

        service.startBillingAppLoadMonitor();
        service.markBillingAppLoaded();
        service.startBillingAppLoadMonitor();

        await waitUntil(() => reportBillingAppLoadFailure.called);

        expect(service.billingAppLoadAttempts).to.equal(1);
        expect(reportBillingAppLoadFailure.calledOnce).to.be.true;
    });

    it('re-arms the monitor after a reported billing app load failure', async function () {
        const service = this.owner.lookup('service:billing');
        billingService = service;
        service.billingAppLoadTimeoutMs = 1;
        service.billingAppLoadRetryDelaysMs = [];
        service.billingAppLoadAttempts = 2;
        service.billingAppLoadFailureReported = true;
        const reportBillingAppLoadFailure = sinon.stub(service, 'reportBillingAppLoadFailure');

        service.startBillingAppLoadMonitor();

        expect(service.billingAppLoadAttempts).to.equal(1);
        expect(service.billingAppLoadFailureReported).to.be.false;

        await waitUntil(() => reportBillingAppLoadFailure.called);

        expect(reportBillingAppLoadFailure.calledOnce).to.be.true;
    });

    it('reloads the billing iframe during a retry', function () {
        const service = this.owner.lookup('service:billing');
        billingService = service;
        const iframe = {src: ''};
        sinon.stub(service, 'getBillingIframe').returns(iframe);
        sinon.stub(service, 'getIframeURL').returns('https://billing.example.test/pro');

        service.reloadBillingIframe();

        expect(iframe.src).to.equal('https://billing.example.test/pro');
    });

    it('reports to Sentry when the billing app does not become ready', async function () {
        const service = this.owner.lookup('service:billing');
        billingService = service;
        service.billingAppLoadAttempts = 2;

        service.reportBillingAppLoadFailure();

        await waitUntil(() => testkit.reports().length > 0);

        expect(testkit.reports()).to.have.lengthOf(1);
        const report = testkit.reports()[0];
        expect(report.message).to.equal('Billing app failed to become ready');
        expect(report.tags).to.deep.include({
            source: 'billing-app-load-monitor'
        });
        expect(report.originalReport.contexts.ghost.billing_monitor).to.deep.include({
            attempts: 2,
            has_billing_url: true,
            is_force_upgrade: false
        });
    });

    it('does not report when the billing app becomes ready before the timeout', function () {
        const service = this.owner.lookup('service:billing');
        billingService = service;

        service.startBillingAppLoadMonitor();
        service.markBillingAppLoaded();

        expect(service.billingAppLoadTimeout).to.be.null;
        expect(service.billingAppRetryTimeout).to.be.null;
        expect(testkit.reports()).to.have.lengthOf(0);
    });

    it('does not report when Sentry is not configured', function () {
        const config = this.owner.lookup('config:main');
        config.sentry_dsn = null;

        const service = this.owner.lookup('service:billing');
        billingService = service;

        service.reportBillingAppLoadFailure();

        expect(testkit.reports()).to.have.lengthOf(0);
    });
});
