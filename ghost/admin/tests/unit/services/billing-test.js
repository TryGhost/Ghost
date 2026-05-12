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
        sinon.restore();
    });

    it('starts a load monitor for the billing app', async function () {
        const service = this.owner.lookup('service:billing');
        service.billingAppLoadTimeoutMs = 1;
        const reportBillingAppLoadFailure = sinon.stub(service, 'reportBillingAppLoadFailure');

        service.startBillingAppLoadMonitor();

        await waitUntil(() => reportBillingAppLoadFailure.called);

        expect(reportBillingAppLoadFailure.calledOnce).to.be.true;
    });

    it('reports to Sentry when the billing app does not become ready', async function () {
        const service = this.owner.lookup('service:billing');

        service.reportBillingAppLoadFailure();

        await waitUntil(() => testkit.reports().length > 0);

        expect(testkit.reports()).to.have.lengthOf(1);
        const report = testkit.reports()[0];
        expect(report.message).to.equal('Billing app failed to become ready');
        expect(report.tags).to.deep.include({
            source: 'billing-app-load-monitor'
        });
        expect(report.originalReport.contexts.ghost.full_error).to.deep.include({
            has_billing_url: true,
            is_force_upgrade: false
        });
    });

    it('does not report when the billing app becomes ready before the timeout', function () {
        const service = this.owner.lookup('service:billing');

        service.startBillingAppLoadMonitor();
        service.markBillingAppLoaded();

        expect(service.billingAppLoadTimeout).to.be.null;
        expect(testkit.reports()).to.have.lengthOf(0);
    });

    it('does not report when Sentry is not configured', function () {
        const config = this.owner.lookup('config:main');
        config.sentry_dsn = null;

        const service = this.owner.lookup('service:billing');

        service.reportBillingAppLoadFailure();

        expect(testkit.reports()).to.have.lengthOf(0);
    });
});
