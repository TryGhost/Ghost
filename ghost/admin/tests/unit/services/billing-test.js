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
        const iframe = {src: '', addEventListener: sinon.stub()};
        sinon.stub(service, 'getBillingIframe').returns(iframe);
        sinon.stub(service, 'getIframeURL').returns('https://billing.example.test/pro');

        service.reloadBillingIframe();

        expect(iframe.src).to.equal('https://billing.example.test/pro');
    });

    it('adds the active attempt id to the billing iframe URL', function () {
        const service = this.owner.lookup('service:billing');
        billingService = service;
        service.billingAppLoadAttemptId = 'attempt-123';

        expect(service.getIframeURL({fetchOwner: false})).to.equal('https://billing.example.test/?bmaAttemptId=attempt-123');
    });

    it('records hidden preload timeout without reporting a visible failure', async function () {
        const service = this.owner.lookup('service:billing');
        billingService = service;
        service.billingAppLoadTimeoutMs = 1;
        service.billingAppLoadRetryDelaysMs = [];
        service.billingAppIframeSrcSetAt = Date.now() - 100;

        service.startBillingAppLoadMonitor();

        await waitUntil(() => service.billingAppPreloadFailure);

        expect(service.billingAppLoadFailureReported).to.be.false;
        expect(service.billingAppPreloadFailure).to.deep.include({
            attempts: 1,
            nonReadyMessageCount: 0,
            lastNonReadyMessageType: null
        });
        expect(testkit.reports()).to.have.lengthOf(0);
    });

    it('promotes an in-flight preload attempt when the user opens billing', function () {
        const service = this.owner.lookup('service:billing');
        billingService = service;
        service.billingAppLoadTimeoutMs = 1000;
        const reloadBillingIframe = sinon.spy(service, 'reloadBillingIframe');

        service.startBillingAppLoadMonitor();
        service.toggleProWindow(true);

        expect(service.billingWindowOpen).to.be.true;
        expect(service.billingAppLoadAttemptSource).to.equal('user_open');
        expect(service.billingAppLoadAttempts).to.equal(1);
        expect(service.billingAppLoadTimeout).to.not.be.null;
        expect(reloadBillingIframe.called).to.be.false;
    });

    it('reloads the iframe for a fresh visible attempt after preload failed', function () {
        const service = this.owner.lookup('service:billing');
        billingService = service;
        const iframe = {src: '', addEventListener: sinon.stub()};
        sinon.stub(service, 'getBillingIframe').returns(iframe);
        service.billingAppPreloadFailure = {
            attemptId: 'preload-attempt',
            attempts: 2,
            elapsedMs: 12000,
            nonReadyMessageCount: 1,
            nonReadyMessageTypes: ['token']
        };

        service.toggleProWindow(true);

        expect(service.billingWindowOpen).to.be.true;
        expect(service.billingAppLoadFailureReported).to.be.false;
        expect(service.billingAppLoadAttemptSource).to.equal('user_open');
        expect(service.billingAppIframeReloadReason).to.equal('visible_open_after_preload_failure');
        expect(service.billingAppLoadTimeout).to.not.be.null;
        expect(iframe.src).to.match(/^https:\/\/billing\.example\.test\/\?bmaAttemptId=/);
    });

    it('reloads the iframe for a fresh visible attempt after a previous visible failure', function () {
        const service = this.owner.lookup('service:billing');
        billingService = service;
        const iframe = {src: '', addEventListener: sinon.stub()};
        sinon.stub(service, 'getBillingIframe').returns(iframe);
        service.billingAppLoadFailureReported = true;

        service.toggleProWindow(true);

        expect(service.billingWindowOpen).to.be.true;
        expect(service.billingAppLoadFailureReported).to.be.false;
        expect(service.billingAppIframeReloadReason).to.equal('visible_open_after_load_failure');
        expect(service.billingAppLoadTimeout).to.not.be.null;
        expect(iframe.src).to.match(/^https:\/\/billing\.example\.test\/\?bmaAttemptId=/);
    });

    it('reports to Sentry with diagnostics when the billing app does not become ready', async function () {
        const service = this.owner.lookup('service:billing');
        billingService = service;
        sinon.stub(service, 'getBillingIframe').returns(null);
        service.billingAppLoadAttempts = 2;
        service.billingAppLoadAttemptId = 'attempt-123';
        service.billingAppLoadAttemptSource = 'user_open';
        service.billingAppIframeReloadReason = 'visible_open_after_preload_failure';
        service.billingAppIframeSrcSetAt = Date.now() - 1234;
        service.billingAppIframeLoadFired = true;
        service.billingWindowOpen = true;
        service.billingAppPreloadFailure = {
            attemptId: 'preload-attempt',
            attempts: 2,
            elapsedMs: 12000,
            nonReadyMessageCount: 1,
            nonReadyMessageTypes: ['token'],
            lastNonReadyMessageType: 'token'
        };

        service.reportBillingAppLoadFailure();

        await waitUntil(() => testkit.reports().length > 0);

        const report = testkit.reports()[0];
        expect(report.message).to.equal('Billing app failed to become ready');
        expect(report.level).to.equal('warning');
        expect(report.originalReport.fingerprint).to.deep.equal([
            'billing-app-load-failure',
            document.visibilityState,
            '2'
        ]);
        expect(report.tags).to.deep.include({source: 'billing-app-load-monitor'});

        const billingMonitor = report.originalReport.contexts.ghost.billing_monitor;
        expect(billingMonitor).to.deep.include({
            attempts: 2,
            attempt_id: 'attempt-123',
            attempt_source: 'user_open',
            attempt_phase: 'shell_ready',
            iframe_reload_reason: 'visible_open_after_preload_failure',
            has_billing_url: true,
            is_force_upgrade: false,
            iframe_src: null,
            configured_billing_origin: 'https://billing.example.test',
            iframe_load_fired: true,
            billing_window_open: true,
            has_preload_failure: true,
            preload_failure_elapsed_ms: 12000,
            preload_non_ready_message_count: 1,
            preload_non_ready_message_types: 'token',
            preload_last_non_ready_message_type: 'token',
            non_ready_message_count: 0,
            non_ready_message_types: '',
            last_non_ready_message_type: null,
            ready_received: false,
            navigator_online: navigator.onLine,
            document_visibility_state: document.visibilityState,
            bma_boot_accessible: false,
            bma_boot_has_mark_ready: false,
            bma_boot_threw: false
        });
        expect(billingMonitor.ms_since_src_set).to.be.a('number').and.to.be.at.least(1234);
        expect(report.tags).to.deep.include({
            attempt_source: 'user_open',
            attempt_phase: 'shell_ready'
        });
    });

    it('reports pre-ready message diagnostics to Sentry', async function () {
        const service = this.owner.lookup('service:billing');
        billingService = service;
        sinon.stub(service, 'getBillingIframe').returns(null);
        service.billingWindowOpen = true;
        service.billingAppLoadAttemptSource = 'user_open';
        service.billingAppLoadAttempts = 2;
        service.billingAppLoadTimeout = setTimeout(() => {}, 10000);
        service.billingAppIframeSrcSetAt = Date.now() - 100;

        service.recordBillingAppPreReadyMessage({request: 'token'});
        service.recordBillingAppPreReadyMessage({route: '/plans'});
        service.recordBillingAppPreReadyMessage({
            subscription: {
                status: 'active'
            }
        });
        service.reportBillingAppLoadFailure();

        await waitUntil(() => testkit.reports().length > 0);

        const billingMonitor = testkit.reports()[0].originalReport.contexts.ghost.billing_monitor;
        expect(billingMonitor).to.deep.include({
            non_ready_message_count: 3,
            non_ready_message_types: 'token,route,subscription',
            last_non_ready_message_type: 'subscription',
            ready_received: false
        });
    });

    it('resets billing app load diagnostics when a fresh iframe load starts', function () {
        const service = this.owner.lookup('service:billing');
        billingService = service;
        const iframe = {src: '', addEventListener: sinon.stub()};
        sinon.stub(service, 'getBillingIframe').returns(iframe);

        service.billingAppLoadTimeout = setTimeout(() => {}, 10000);
        service.recordBillingAppPreReadyMessage({request: 'token'});
        service.markBillingAppLoaded({request: 'billingAppReady'});

        service.setBillingIframeSrc();

        expect(service.billingAppPreReadyMessageCount).to.equal(0);
        expect(service.billingAppPreReadyMessageTypes).to.deep.equal([]);
        expect(service.billingAppLastPreReadyMessageType).to.be.null;
        expect(service.billingAppReadyReceivedAt).to.be.null;
        expect(service.billingAppReadyPayload).to.be.null;
    });

    it('treats late billingAppReady as recovery after a reported load failure', function () {
        const service = this.owner.lookup('service:billing');
        billingService = service;
        const readyPayload = {
            request: 'billingAppReady',
            state: 'content'
        };
        service.billingAppLoadFailureReported = true;

        service.markBillingAppLoaded(readyPayload);

        expect(service.billingAppLoaded).to.be.true;
        expect(service.billingAppLoadFailureReported).to.be.false;
        expect(service.billingAppReadyReceivedAt).to.be.a('number');
        expect(service.billingAppReadyPayload).to.equal(readyPayload);
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
