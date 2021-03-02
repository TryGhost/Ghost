const {EventProcessor} = require('@tryghost/email-analytics-service');
const moment = require('moment');

class GhostEventProcessor extends EventProcessor {
    constructor({db}) {
        super(...arguments);

        this.db = db;

        // avoid having to query email_batch by provider_id for every event
        this.providerIdEmailIdMap = {};
    }

    async getEmailId(event) {
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

        return undefined;
    }

    async getMemberId(event) {
        const emailId = await this.getEmailId(event);

        if (!emailId) {
            return false;
        }

        if (emailId && event.recipientEmail) {
            const {memberId} = await this.db.knex('email_recipients')
                .select('member_id as memberId')
                .where('member_email', event.recipientEmail)
                .where('email_id', emailId)
                .first() || {};

            return memberId;
        }

        return undefined;
    }

    async handleDelivered(event) {
        const emailId = await this.getEmailId(event);

        if (!emailId) {
            return false;
        }

        const updateResult = await this.db.knex('email_recipients')
            .where('email_id', '=', emailId)
            .where('member_email', '=', event.recipientEmail)
            .update({
                delivered_at: this.db.knex.raw('COALESCE(delivered_at, ?)', [moment.utc(event.timestamp).format('YYYY-MM-DD HH:mm:ss')])
            });

        return updateResult > 0;
    }

    async handleOpened(event) {
        const emailId = await this.getEmailId(event);

        if (!emailId) {
            return false;
        }

        const updateResult = await this.db.knex('email_recipients')
            .where('email_id', '=', emailId)
            .where('member_email', '=', event.recipientEmail)
            .update({
                opened_at: this.db.knex.raw('COALESCE(opened_at, ?)', [moment.utc(event.timestamp).format('YYYY-MM-DD HH:mm:ss')])
            });

        return updateResult > 0;
    }

    async handleTemporaryFailed(/*event*/) {
        // noop - we don't do anything with temporary failures for now
    }

    async handlePermanentFailed(event) {
        const emailId = await this.getEmailId(event);

        if (!emailId) {
            return false;
        }

        const updateResult = await this.db.knex('email_recipients')
            .where('email_id', '=', emailId)
            .where('member_email', '=', event.recipientEmail)
            .update({
                failed_at: this.db.knex.raw('COALESCE(failed_at, ?)', [moment.utc(event.timestamp).format('YYYY-MM-DD HH:mm:ss')])
            });

        return updateResult > 0;
    }

    async handleUnsubscribed(event) {
        const memberId = await this.getMemberId(event);

        if (!memberId) {
            return false;
        }

        const updateResult = await this.db.knex('members')
            .where('id', '=', memberId)
            .update({
                subscribed: false,
                updated_at: moment.utc().toDate()
            });

        return updateResult > 0;
    }

    async handleComplained(event) {
        const memberId = await this.getMemberId(event);

        if (!memberId) {
            return false;
        }

        const updateResult = await this.db.knex('members')
            .where('id', '=', memberId)
            .update({
                subscribed: false,
                updated_at: moment.utc().toDate()
            });

        return updateResult > 0;
    }
}

module.exports = GhostEventProcessor;
