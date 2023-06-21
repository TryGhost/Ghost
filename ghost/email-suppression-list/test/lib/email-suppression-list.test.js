const assert = require('assert/strict');
const {EmailSuppressionData, EmailSuppressedEvent} = require('../../lib/email-suppression-list');

describe('EmailSuppressionData', function () {
    it('Has null info when not suppressed', function () {
        const now = new Date();
        const data = new EmailSuppressionData(false, {
            reason: 'spam',
            timestamp: now
        });

        assert(data.suppressed === false);
        assert(data.info === null);
    });
    it('Has info when suppressed', function () {
        const now = new Date();
        const data = new EmailSuppressionData(true, {
            reason: 'spam',
            timestamp: now
        });

        assert(data.suppressed === true);
        assert(data.info.reason === 'spam');
        assert(data.info.timestamp === now);
    });
});

describe('EmailSuppressedEvent', function () {
    it('Exposes a create factory method', function () {
        const event = EmailSuppressedEvent.create({
            emailAddress: 'test@test.com',
            emailId: '1234567890abcdef',
            reason: 'spam'
        });
        assert(event instanceof EmailSuppressedEvent);
        assert(event.timestamp);
    });
});
