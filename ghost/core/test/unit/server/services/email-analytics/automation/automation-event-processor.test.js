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

    it('applies opened events to recipient and automation counters', async function () {
        const openedAt = new Date('2026-07-03T16:30:00.000Z');
        const recipientRepository = createFakeRecipientRepository({
            recipient: {
                id: 'recipient-id',
                mailgun_message_id: '<message-id@mailgun.example>',
                member_email: 'member@example.com',
                member_id: 'member-id',
                automation_action_revision_id: 'revision-id',
                opened_at: null
            },
            actionRevision: {
                id: 'revision-id',
                opened_count: 0
            },
            member: {
                id: 'member-id',
                automation_email_count: 5,
                automation_email_opened_count: 1,
                automation_email_open_rate: null
            }
        });
        const processor = new AutomationEventProcessor({recipientRepository});

        await processor.processEvents([{
            id: 'event-id',
            type: 'opened',
            providerId: '<message-id@mailgun.example>',
            recipientEmail: 'member@example.com',
            timestamp: openedAt
        }]);

        assert.equal(recipientRepository.recipient.opened_at, openedAt);
        assert.equal(recipientRepository.actionRevision.opened_count, 1);
        assert.equal(recipientRepository.member.automation_email_opened_count, 2);
        assert.equal(recipientRepository.member.automation_email_open_rate, 40);
        assert.equal(recipientRepository.transactionCount, 1);
    });

    it('applies delivered events to recipient and automation counters', async function () {
        const deliveredAt = new Date('2026-07-03T16:30:00.000Z');
        const recipientRepository = createFakeRecipientRepository({
            recipient: {
                id: 'recipient-id',
                mailgun_message_id: '<message-id@mailgun.example>',
                member_email: 'member@example.com',
                member_id: 'member-id',
                automation_action_revision_id: 'revision-id',
                delivered_at: null
            },
            actionRevision: {
                id: 'revision-id',
                delivered_count: 0
            },
            member: {
                id: 'member-id',
                automation_email_count: 5,
                automation_email_opened_count: 1,
                automation_email_open_rate: null
            }
        });
        const processor = new AutomationEventProcessor({recipientRepository});

        await processor.processEvents([{
            id: 'event-id',
            type: 'delivered',
            providerId: '<message-id@mailgun.example>',
            recipientEmail: 'member@example.com',
            timestamp: deliveredAt
        }]);

        assert.equal(recipientRepository.recipient.delivered_at, deliveredAt);
        assert.equal(recipientRepository.actionRevision.delivered_count, 1);
        assert.equal(recipientRepository.member.automation_email_opened_count, 1);
        assert.equal(recipientRepository.member.automation_email_open_rate, null);
        assert.equal(recipientRepository.transactionCount, 1);
    });

    it('does not double-increment counters for duplicate opened events', async function () {
        const firstOpenedAt = new Date('2026-07-03T16:30:00.000Z');
        const duplicateOpenedAt = new Date('2026-07-03T16:35:00.000Z');
        const recipientRepository = createFakeRecipientRepository({
            recipient: {
                id: 'recipient-id',
                mailgun_message_id: '<message-id@mailgun.example>',
                member_email: 'member@example.com',
                member_id: 'member-id',
                automation_action_revision_id: 'revision-id',
                opened_at: null
            },
            actionRevision: {
                id: 'revision-id',
                opened_count: 0
            },
            member: {
                id: 'member-id',
                automation_email_count: 5,
                automation_email_opened_count: 1,
                automation_email_open_rate: null
            }
        });
        const processor = new AutomationEventProcessor({recipientRepository});

        await processor.processEvents([{
            id: 'event-id-1',
            type: 'opened',
            providerId: '<message-id@mailgun.example>',
            recipientEmail: 'member@example.com',
            timestamp: firstOpenedAt
        }, {
            id: 'event-id-2',
            type: 'opened',
            providerId: '<message-id@mailgun.example>',
            recipientEmail: 'member@example.com',
            timestamp: duplicateOpenedAt
        }]);

        assert.equal(recipientRepository.recipient.opened_at, firstOpenedAt);
        assert.equal(recipientRepository.actionRevision.opened_count, 1);
        assert.equal(recipientRepository.member.automation_email_opened_count, 2);
        assert.equal(recipientRepository.member.automation_email_open_rate, 40);
        assert.equal(recipientRepository.transactionCount, 1);
    });
});

function createFakeRecipientRepository({recipient, actionRevision, member}) {
    return {
        recipient,
        actionRevision,
        member,
        transactionCount: 0,

        async withTransaction(callback) {
            this.transactionCount += 1;
            return await callback({transaction: true});
        },

        async findByMailgunMessageIdAndMemberEmail({mailgunMessageId, memberEmail}) {
            if (
                recipient.mailgun_message_id === mailgunMessageId &&
                recipient.member_email === memberEmail
            ) {
                return recipient;
            }

            return null;
        },

        async markOpened({recipientId, openedAt}) {
            assert.equal(recipientId, recipient.id);

            if (recipient.opened_at) {
                return false;
            }

            recipient.opened_at = openedAt;
            return true;
        },

        async markDelivered({recipientId, deliveredAt}) {
            assert.equal(recipientId, recipient.id);

            recipient.delivered_at = deliveredAt;
            return true;
        },

        async incrementActionRevisionOpenedCount({automationActionRevisionId, incrementBy}) {
            assert.equal(automationActionRevisionId, actionRevision.id);
            actionRevision.opened_count += incrementBy;
        },

        async incrementActionRevisionDeliveredCount({automationActionRevisionId, incrementBy}) {
            assert.equal(automationActionRevisionId, actionRevision.id);
            actionRevision.delivered_count += incrementBy;
        },

        async incrementMemberAutomationOpenedCount({memberId, incrementBy}) {
            assert.equal(memberId, member.id);
            member.automation_email_opened_count += incrementBy;

            return {
                automationEmailCount: member.automation_email_count,
                automationEmailOpenedCount: member.automation_email_opened_count
            };
        },

        async updateMemberAutomationOpenRate({memberId, openRate}) {
            assert.equal(memberId, member.id);
            member.automation_email_open_rate = openRate;
        }
    };
}
