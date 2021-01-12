const moment = require('moment');

class EmailAnalyticsEventProcessor {
    constructor({db, logging}) {
        this.db = db;
        this.logging = logging || console;

        // avoid having to query email_batch by provider_id for every event
        this.providerIdEmailIdMap = {};
    }

    async process(event) {
        if (event.type === 'delivered') {
            return this.handleDelivered(event);
        }

        if (event.type === 'opened') {
            return this.handleOpened(event);
        }

        if (event.type === 'failed') {
            return this.handleFailed(event);
        }

        if (event.type === 'unsubscribed') {
            return this.handleUnsubscribed(event);
        }

        if (event.type === 'complained') {
            return this.handleComplained(event);
        }

        return {
            unhandled: 1
        };
    }

    async handleDelivered(event) {
        const emailId = await this._getEmailId(event);

        if (!emailId) {
            return {unprocessable: 1};
        }

        // this doesn't work - the Base model intercepts the attr and tries to convert "COALESCE(...)" to a date
        // await this.models.EmailRecipient
        //     .where({email_id: emailId, member_email: event.recipientEmail})
        //     .save({delivered_at: this.db.knex.raw('COALESCE(delivered_at, ?)', [moment.utc(event.timestamp).format('YYYY-MM-DD HH:mm:ss')])}, {patch: true, {context: {internal: true}}});

        const updateResult = await this.db.knex('email_recipients')
            .where('email_id', '=', emailId)
            .where('member_email', '=', event.recipientEmail)
            .update({
                delivered_at: this.db.knex.raw('COALESCE(delivered_at, ?)', [moment.utc(event.timestamp).format('YYYY-MM-DD HH:mm:ss')])
            });

        if (updateResult !== 0) {
            const memberId = await this._getMemberId(event);

            return {
                delivered: 1,
                emailIds: [emailId],
                memberIds: [memberId]
            };
        }

        return {delivered: 1};
    }

    async handleOpened(event) {
        const emailId = await this._getEmailId(event);

        if (!emailId) {
            return {unprocessable: 1};
        }

        const updateResult = await this.db.knex('email_recipients')
            .where('email_id', '=', emailId)
            .where('member_email', '=', event.recipientEmail)
            .update({
                opened_at: this.db.knex.raw('COALESCE(opened_at, ?)', [moment.utc(event.timestamp).format('YYYY-MM-DD HH:mm:ss')])
            });

        if (updateResult !== 0) {
            const memberId = await this._getMemberId(event);

            return {
                opened: 1,
                emailIds: [emailId],
                memberIds: [memberId]
            };
        }

        return {opened: 1};
    }

    async handleFailed(event) {
        if (event.severity === 'permanent') {
            const emailId = await this._getEmailId(event);

            if (!emailId) {
                return {unprocessable: 1};
            }

            await this.db.knex('email_recipients')
                .where('email_id', '=', emailId)
                .where('member_email', '=', event.recipientEmail)
                .update({
                    failed_at: this.db.knex.raw('COALESCE(failed_at, ?)', [moment.utc(event.timestamp).format('YYYY-MM-DD HH:mm:ss')])
                });

            return {
                failed: 1,
                emailIds: [emailId]
            };
        }

        if (event.severity === 'temporary') {
            // we don't care about soft bounces at the moment
            return {unhandled: 1};
        }
    }

    async handleUnsubscribed(event) {
        const emailId = await this._getEmailId(event);

        if (!emailId) {
            return {unprocessable: 1};
        }

        // saving via bookshelf triggers label fetch/update which errors and slows down processing
        await this.db.knex('members')
            .where('id', '=', this.db.knex('email_recipients')
                .select('member_id')
                .where('email_id', '=', emailId)
                .where('member_email', '=', event.recipientEmail)
            )
            .update({
                subscribed: false,
                updated_at: moment.utc().toDate()
            });

        return {
            unsubscribed: 1
        };
    }

    async handleComplained(event) {
        const emailId = await this._getEmailId(event);

        if (!emailId) {
            return {unprocessable: 1};
        }

        // saving via bookshelf triggers label fetch/update which errors and slows down processing
        await this.db.knex('members')
            .where('id', '=', this.db.knex('email_recipients')
                .select('member_id')
                .where('email_id', '=', emailId)
                .where('member_email', '=', event.recipientEmail)
            )
            .update({
                subscribed: false,
                updated_at: moment.utc().toDate()
            });

        return {
            complained: 1
        };
    }

    async _getEmailId(event) {
        if (event.emailId) {
            return event.emailId;
        }

        if (event.providerId) {
            if (this.providerIdEmailIdMap[event.providerId]) {
                return this.providerIdEmailIdMap[event.providerId];
            }

            const {emailId} = await this.db.knex('email_batches')
                .select('email_id as emailId')
                .where('provider_id', event.providerId)
                .first() || {};

            if (!emailId) {
                return;
            }

            this.providerIdEmailIdMap[event.providerId] = emailId;
            return emailId;
        }
    }

    async _getMemberId(event) {
        if (event.memberId) {
            return event.memberId;
        }

        const emailId = await this._getEmailId(event);

        if (emailId && event.recipientEmail) {
            const {memberId} = await this.db.knex('email_recipients')
                .select('member_id as memberId')
                .where('member_email', event.recipientEmail)
                .where('email_id', emailId)
                .first() || {};

            return memberId;
        }
    }
}

module.exports = EmailAnalyticsEventProcessor;
