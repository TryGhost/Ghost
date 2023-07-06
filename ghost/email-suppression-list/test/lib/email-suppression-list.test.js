const assert = require('assert/strict');
const {EmailSuppressionData} = require('../../lib/email-suppression-list');

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
