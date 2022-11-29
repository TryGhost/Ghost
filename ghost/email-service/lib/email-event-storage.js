const {EmailDeliveredEvent, EmailOpenedEvent, EmailBouncedEvent, EmailUnsubscribedEvent, SpamComplaintEvent} = require('@tryghost/email-events');
const moment = require('moment-timezone');

class EmailEventStorage {
    #db;
    #membersRepository;

    constructor({db, membersRepository}) {
        this.#db = db;
        this.#membersRepository = membersRepository;
    }

    listen(domainEvents) {
        domainEvents.subscribe(EmailDeliveredEvent, async (event) => {
            await this.handleDelivered(event);
        });

        domainEvents.subscribe(EmailOpenedEvent, async (event) => {
            await this.handleOpened(event);
        });

        domainEvents.subscribe(EmailBouncedEvent, async (event) => {
            await this.handlePermanentFailed(event);
        });

        domainEvents.subscribe(EmailUnsubscribedEvent, async (event) => {
            await this.handleUnsubscribed(event);
        });

        domainEvents.subscribe(SpamComplaintEvent, async (event) => {
            await this.handleComplained(event);
        });
    }

    async handleDelivered(event) {
        await this.#db.knex('email_recipients')
            .where('id', '=', event.emailRecipientId)
            .update({
                delivered_at: this.#db.knex.raw('COALESCE(delivered_at, ?)', [moment.utc(event.timestamp).format('YYYY-MM-DD HH:mm:ss')])
            });
    }

    async handleOpened(event) {
        await this.#db.knex('email_recipients')
            .where('id', '=', event.emailRecipientId)
            .update({
                opened_at: this.#db.knex.raw('COALESCE(opened_at, ?)', [moment.utc(event.timestamp).format('YYYY-MM-DD HH:mm:ss')])
            });
    }

    async handlePermanentFailed(event) {
        await this.#db.knex('email_recipients')
            .where('id', '=', event.emailRecipientId)
            .update({
                failed_at: this.#db.knex.raw('COALESCE(failed_at, ?)', [moment.utc(event.timestamp).format('YYYY-MM-DD HH:mm:ss')])
            });
    }

    async handleUnsubscribed(event) {
        return this.unsubscribeFromNewsletters(event);
    }

    async handleComplained(event) {
        return this.unsubscribeFromNewsletters(event);
    }

    async unsubscribeFromNewsletters(event) {
        await this.#membersRepository.update({newsletters: []}, {id: event.memberId});
    }
}

module.exports = EmailEventStorage;
