const assert = require('node:assert/strict');
const sinon = require('sinon');
const DomainEvents = require('@tryghost/domain-events');
const models = require('../../../../../core/server/models');
const MailgunEmailSuppressionList = require('../../../../../core/server/services/email-suppression-list/mailgun-email-suppression-list');
const EmailBouncedEvent = require('../../../../../core/server/services/email-service/events/email-bounced-event');
const SpamComplaintEvent = require('../../../../../core/server/services/email-service/events/spam-complaint-event');

describe('UNIT: MailgunEmailSuppressionList bounce gate', function () {
    let Suppression;

    // DomainEvents.subscribe() has no unsubscribe - init() has to run exactly once for
    // this suite, or repeated calls accumulate duplicate listeners and every later
    // dispatch fires N times.
    beforeAll(async function () {
        const list = new MailgunEmailSuppressionList({Suppression: models.Suppression, apiClient: {}});
        await list.init();
    });

    beforeEach(function () {
        // init() always wires the real models.Suppression (not the constructor's
        // `deps.Suppression`, which only matters before init() runs), so the model
        // itself has to be stubbed to test the bounce gate.
        Suppression = sinon.stub(models.Suppression, 'add').resolves();
    });

    afterEach(function () {
        sinon.restore();
    });

    it('suppresses a Mailgun-shaped permanent bounce (error code 605)', async function () {
        DomainEvents.dispatch(EmailBouncedEvent.create({
            email: 'a@example.com', emailId: 'e1', error: {code: 605, message: 'bounced'}, timestamp: new Date()
        }));
        await DomainEvents.allSettled();

        assert.ok(Suppression.calledOnce);
    });

    it('does not suppress a Mailgun-shaped soft bounce (error code 550, not 605/607)', async function () {
        DomainEvents.dispatch(EmailBouncedEvent.create({
            email: 'a@example.com', emailId: 'e1', error: {code: 550, message: 'bounced'}, timestamp: new Date()
        }));
        await DomainEvents.allSettled();

        assert.ok(Suppression.notCalled);
    });

    it('does not suppress a Mailgun bounce with a non-integer/absent error code (unchanged stock behaviour)', async function () {
        // Mailgun's own normalizer can produce this shape for a genuine permanent
        // failure (see mailgun-client.js) - provenance, not error shape, is what
        // decides trust, so this must stay un-suppressed exactly as before.
        DomainEvents.dispatch(EmailBouncedEvent.create({
            email: 'a@example.com', emailId: 'e1', error: null, timestamp: new Date()
        }));
        await DomainEvents.allSettled();

        assert.ok(Suppression.notCalled);
    });

    it('trusts a webhook-sourced adapter permanent bounce with a non-integer error code', async function () {
        // e.g. an SES/SMTP adapter reporting "550 5.1.1" as a string, or an
        // enhanced-code-only shape - not a Mailgun 605/607 integer.
        DomainEvents.dispatch(EmailBouncedEvent.create({
            email: 'a@example.com', emailId: 'e1', error: {code: '550 5.1.1', message: 'bounced'}, timestamp: new Date(), isWebhookSourced: true
        }));
        await DomainEvents.allSettled();

        assert.ok(Suppression.calledOnce);
    });

    it('trusts a webhook-sourced adapter permanent bounce with no error object', async function () {
        DomainEvents.dispatch(EmailBouncedEvent.create({
            email: 'a@example.com', emailId: 'e1', error: null, timestamp: new Date(), isWebhookSourced: true
        }));
        await DomainEvents.allSettled();

        assert.ok(Suppression.calledOnce);
    });

    it('bypasses the 605/607 gate entirely once isWebhookSourced is set, even for a Mailgun-shaped non-605/607 code', async function () {
        DomainEvents.dispatch(EmailBouncedEvent.create({
            email: 'a@example.com', emailId: 'e1', error: {code: 550, message: 'bounced'}, timestamp: new Date(), isWebhookSourced: true
        }));
        await DomainEvents.allSettled();

        assert.ok(Suppression.calledOnce);
    });

    it('suppresses spam complaints regardless of error shape', async function () {
        DomainEvents.dispatch(SpamComplaintEvent.create({
            email: 'a@example.com', emailId: 'e1', timestamp: new Date()
        }));
        await DomainEvents.allSettled();

        assert.ok(Suppression.calledOnce);
    });
});
