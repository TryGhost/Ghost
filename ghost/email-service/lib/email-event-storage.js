const {EmailDeliveredEvent, EmailOpenedEvent, EmailBouncedEvent, SpamComplaintEvent, EmailUnsubscribedEvent} = require('@tryghost/email-events');
const moment = require('moment-timezone');

class EmailEventStorage {
    #db;

    constructor({db}) {
        this.#db = db;
    }

    listen(domainEvents) {
        domainEvents.subscribe(EmailDeliveredEvent, async (event) => {
            await this.#db.knex('email_recipients')
                .where('id', '=', event.emailRecipientId)
                .update({
                    delivered_at: this.#db.knex.raw('COALESCE(delivered_at, ?)', [moment.utc(event.timestamp).format('YYYY-MM-DD HH:mm:ss')])
                });
        });

        domainEvents.subscribe(EmailOpenedEvent, async (event) => {
            await this.#db.knex('email_recipients')
                .where('id', '=', event.emailRecipientId)
                .update({
                    opened_at: this.#db.knex.raw('COALESCE(opened_at, ?)', [moment.utc(event.timestamp).format('YYYY-MM-DD HH:mm:ss')])
                });

            // Using the default timezone set in https://github.com/TryGhost/Ghost/blob/2c5643623db0fc4db390f6997c81a73dca7ccacd/core/server/data/schema/default-settings/default-settings.json#L105
            let timezone = 'Etc/UTC';
            const timezoneData = await this.#db.knex('settings').first('value').where('key', 'timezone');
            if (timezoneData && timezoneData.value) {
                timezone = timezoneData.value;
            }

            await this.#db.knex('members')
                .where('id', '=', event.memberId)
                .andWhere(builder => builder
                    .where('last_seen_at', '<', moment.utc(event.timestamp).tz(timezone).startOf('day').utc().format('YYYY-MM-DD HH:mm:ss'))
                    .orWhereNull('last_seen_at')
                )
                .update({
                    last_seen_at: moment.utc(event.timestamp).format('YYYY-MM-DD HH:mm:ss')
                });
        });
    }
}

module.exports = EmailEventStorage;
