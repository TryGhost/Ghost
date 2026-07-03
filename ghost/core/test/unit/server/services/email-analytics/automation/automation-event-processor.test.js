const assert = require('node:assert/strict');

const sinon = require('sinon');

const AutomationEventProcessor = require('../../../../../../core/server/services/email-analytics/automation/automation-event-processor');

describe('AutomationEventProcessor', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('resolves opened events by Mailgun message id and recipient email', async function () {
        const recipient = {
            id: 'recipient-id',
            mailgun_message_id: '<message-id@mailgun.example>',
            member_email: 'member@example.com',
            member_id: 'member-id',
            automation_action_revision_id: 'revision-id'
        };
        const recipientRepository = {
            findByMailgunMessageIdAndMemberEmail: sinon.stub().resolves(recipient)
        };
        const processor = new AutomationEventProcessor({recipientRepository});

        const result = await processor.resolveRecipient({
            id: 'event-id',
            type: 'opened',
            providerId: '<message-id@mailgun.example>',
            recipientEmail: 'member@example.com',
            timestamp: new Date('2026-07-03T16:30:00.000Z')
        });

        sinon.assert.calledOnceWithExactly(
            recipientRepository.findByMailgunMessageIdAndMemberEmail,
            {
                mailgunMessageId: '<message-id@mailgun.example>',
                memberEmail: 'member@example.com'
            }
        );
        assert.equal(result, recipient);
    });
});
