class StaffService {
    constructor({config, logging, models, mailer, settingsCache, urlService, urlUtils}) {
        /** @private */
        this.models = models;
        this.logging = logging;

        /** @private */
        this.settingsCache = settingsCache;

        const Emails = require('./emails');
        /** @private */
        this.emails = new Emails({
            config,
            logging,
            models,
            mailer,
            settingsCache,
            urlService,
            urlUtils
        });
    }

    async notifyFreeMemberSignup(member) {
        try {
            await this.emails.notifyFreeMemberSignup(member);
        } catch (e) {
            this.logging.error(`Failed to notify free member signup - ${member?.id}`);
        }
    }

    async notifyPaidSubscriptionStart({member, offer, tier, subscription}) {
        try {
            await this.emails.notifyPaidSubscriptionStarted({member, offer, tier, subscription});
        } catch (e) {
            this.logging.error(`Failed to notify paid member subscription start - ${member?.id}`);
        }
    }

    async notifyPaidSubscriptionCancel({member, cancellationReason, tier, subscription}) {
        try {
            await this.emails.notifyPaidSubscriptionCanceled({member, cancellationReason, tier, subscription});
        } catch (e) {
            this.logging.error(`Failed to notify paid member subscription cancel - ${member?.id}`);
        }
    }
}

module.exports = StaffService;
