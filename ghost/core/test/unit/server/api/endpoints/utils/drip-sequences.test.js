const assert = require('node:assert/strict');
const {orderSequenceEmails} = require('../../../../../../core/server/api/endpoints/utils/drip-sequences');

describe('drip sequence utility', function () {
    it('orders linked-list emails from head to tail', function () {
        const emails = [
            {id: 'b', next_welcome_email_automated_email_id: 'c', created_at: '2026-04-01T00:00:00.000Z'},
            {id: 'c', next_welcome_email_automated_email_id: null, created_at: '2026-04-01T00:00:00.000Z'},
            {id: 'a', next_welcome_email_automated_email_id: 'b', created_at: '2026-04-01T00:00:00.000Z'}
        ];

        const ordered = orderSequenceEmails(emails);
        assert.deepEqual(ordered.map(email => email.id), ['a', 'b', 'c']);
    });

    it('falls back to deterministic ordering when chain is invalid', function () {
        const emails = [
            {id: 'x2', next_welcome_email_automated_email_id: 'x1', created_at: '2026-04-03T00:00:00.000Z'},
            {id: 'x1', next_welcome_email_automated_email_id: 'x2', created_at: '2026-04-02T00:00:00.000Z'},
            {id: 'a1', next_welcome_email_automated_email_id: null, created_at: '2026-04-01T00:00:00.000Z'}
        ];

        const ordered = orderSequenceEmails(emails);
        assert.deepEqual(ordered.map(email => email.id), ['a1', 'x1', 'x2']);
    });
});
