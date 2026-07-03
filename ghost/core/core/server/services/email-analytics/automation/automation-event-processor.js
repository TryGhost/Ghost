const errors = require('@tryghost/errors');

const MIN_AUTOMATION_EMAIL_COUNT_FOR_OPEN_RATE = 5;

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

    async processEvents(events) {
        return await this.#recipientRepository.withTransaction(async (transacting) => {
            const result = {
                delivered: 0,
                opened: 0
            };

            for (const event of events) {
                if (event?.type === 'delivered') {
                    const recipient = await this.#resolveRecipient(event, {transacting});

                    if (!recipient) {
                        continue;
                    }

                    const deliveredAt = this.#getEventTimestamp(event);
                    const didTransition = await this.#recipientRepository.markDelivered({
                        recipientId: recipient.id,
                        deliveredAt
                    }, {transacting});

                    if (!didTransition) {
                        continue;
                    }

                    await this.#recipientRepository.incrementActionRevisionDeliveredCount({
                        automationActionRevisionId: recipient.automation_action_revision_id,
                        incrementBy: 1
                    }, {transacting});

                    result.delivered += 1;
                    continue;
                }

                if (event?.type !== 'opened') {
                    continue;
                }

                const recipient = await this.#resolveRecipient(event, {transacting});

                if (!recipient) {
                    continue;
                }

                const openedAt = this.#getEventTimestamp(event);
                const didTransition = await this.#recipientRepository.markOpened({
                    recipientId: recipient.id,
                    openedAt
                }, {transacting});

                if (!didTransition) {
                    continue;
                }

                await this.#recipientRepository.incrementActionRevisionOpenedCount({
                    automationActionRevisionId: recipient.automation_action_revision_id,
                    incrementBy: 1
                }, {transacting});

                const memberStats = await this.#recipientRepository.incrementMemberAutomationOpenedCount({
                    memberId: recipient.member_id,
                    incrementBy: 1
                }, {transacting});

                if (memberStats.automationEmailCount >= MIN_AUTOMATION_EMAIL_COUNT_FOR_OPEN_RATE) {
                    await this.#recipientRepository.updateMemberAutomationOpenRate({
                        memberId: recipient.member_id,
                        openRate: Math.round(memberStats.automationEmailOpenedCount / memberStats.automationEmailCount * 100)
                    }, {transacting});
                }

                result.opened += 1;
            }

            return result;
        });
    }

    async #resolveRecipient(event, {transacting} = {}) {
        const mailgunMessageId = event?.providerId;
        const memberEmail = event?.recipientEmail;

        if (!mailgunMessageId || !memberEmail) {
            return null;
        }

        return await this.#recipientRepository.findByMailgunMessageIdAndMemberEmail({
            mailgunMessageId,
            memberEmail
        }, {transacting});
    }

    #getEventTimestamp(event) {
        if (event?.timestamp instanceof Date) {
            return event.timestamp;
        }

        return new Date(event.timestamp);
    }
}

function createRecipientRepository({db} = {}) {
    if (!db) {
        throw new errors.IncorrectUsageError({
            message: 'AutomationEventProcessor requires recipientRepository or db'
        });
    }

    return {
        async withTransaction(callback) {
            return await db.knex.transaction(async (transacting) => {
                return await callback(transacting);
            });
        },

        async findByMailgunMessageIdAndMemberEmail({mailgunMessageId, memberEmail}, {transacting} = {}) {
            return await (transacting || db.knex)('automated_email_recipients')
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
        },

        async markOpened({recipientId, openedAt}, {transacting} = {}) {
            const affectedRows = await (transacting || db.knex)('automated_email_recipients')
                .where('id', recipientId)
                .whereNull('opened_at')
                .update({
                    opened_at: openedAt
                });

            return affectedRows > 0;
        },

        async markDelivered({recipientId, deliveredAt}, {transacting} = {}) {
            const affectedRows = await (transacting || db.knex)('automated_email_recipients')
                .where('id', recipientId)
                .update({
                    delivered_at: deliveredAt
                });

            return affectedRows > 0;
        },

        async incrementActionRevisionOpenedCount({automationActionRevisionId, incrementBy}, {transacting} = {}) {
            await (transacting || db.knex)('automation_action_revisions')
                .where('id', automationActionRevisionId)
                .increment('opened_count', incrementBy);
        },

        async incrementActionRevisionDeliveredCount({automationActionRevisionId, incrementBy}, {transacting} = {}) {
            await (transacting || db.knex)('automation_action_revisions')
                .where('id', automationActionRevisionId)
                .increment('delivered_count', incrementBy);
        },

        async incrementMemberAutomationOpenedCount({memberId, incrementBy}, {transacting} = {}) {
            const knex = transacting || db.knex;

            await knex('members')
                .where('id', memberId)
                .increment('automation_email_opened_count', incrementBy);

            const member = await knex('members')
                .select('automation_email_count', 'automation_email_opened_count')
                .where('id', memberId)
                .first();

            return {
                automationEmailCount: member.automation_email_count,
                automationEmailOpenedCount: member.automation_email_opened_count
            };
        },

        async updateMemberAutomationOpenRate({memberId, openRate}, {transacting} = {}) {
            await (transacting || db.knex)('members')
                .where('id', memberId)
                .update({
                    automation_email_open_rate: openRate
                });
        }
    };
}

module.exports = AutomationEventProcessor;
