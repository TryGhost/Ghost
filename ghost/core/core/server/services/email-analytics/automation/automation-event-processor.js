const errors = require('@tryghost/errors');

class AutomationEventProcessor {
    #recipientRepository;

    constructor({recipientRepository, db} = {}) {
        this.#recipientRepository = recipientRepository || createRecipientRepository({db});
    }

    async resolveRecipient(event) {
        const mailgunMessageId = event?.providerId;
        const memberEmail = event?.recipientEmail;

        if (!mailgunMessageId || !memberEmail) {
            return null;
        }

        return await this.#recipientRepository.findByMailgunMessageIdAndMemberEmail({
            mailgunMessageId,
            memberEmail
        });
    }
}

function createRecipientRepository({db} = {}) {
    if (!db) {
        throw new errors.IncorrectUsageError({
            message: 'AutomationEventProcessor requires recipientRepository or db'
        });
    }

    return {
        async findByMailgunMessageIdAndMemberEmail({mailgunMessageId, memberEmail}) {
            return await db.knex('automated_email_recipients')
                .select(
                    'id',
                    'member_id',
                    'member_email',
                    'mailgun_message_id',
                    'automation_action_revision_id',
                    'delivered_at',
                    'opened_at'
                )
                .where('mailgun_message_id', mailgunMessageId)
                .where('member_email', memberEmail)
                .first() || null;
        }
    };
}

module.exports = AutomationEventProcessor;
