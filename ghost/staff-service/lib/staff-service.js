class StaffService {
    constructor({logging, models, mailer, settingsCache, settingsHelpers, urlUtils}) {
        this.logging = logging;

        /** @private */
        this.settingsCache = settingsCache;
        this.models = models;

        const Emails = require('./emails');

        /** @private */
        this.emails = new Emails({
            logging,
            models,
            mailer,
            settingsHelpers,
            settingsCache,
            urlUtils
        });
    }

    async notifyFreeMemberSignup(member, options) {
        try {
            await this.emails.notifyFreeMemberSignup(member, options);
        } catch (e) {
            this.logging.error(`Failed to notify free member signup - ${member?.id}`);
        }
    }

    async notifyPaidSubscriptionStart({member, offer, tier, subscription}, options) {
        try {
            await this.emails.notifyPaidSubscriptionStarted({member, offer, tier, subscription}, options);
        } catch (e) {
            this.logging.error(`Failed to notify paid member subscription start - ${member?.id}`);
        }
    }

    async notifyPaidSubscriptionCancel({member, cancellationReason, tier, subscription}, options) {
        try {
            await this.emails.notifyPaidSubscriptionCanceled({member, cancellationReason, tier, subscription}, options);
        } catch (e) {
            this.logging.error(`Failed to notify paid member subscription cancel - ${member?.id}`);
        }
    }
}

module.exports = StaffService;
