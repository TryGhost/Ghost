const {MemberCreatedEvent, SubscriptionCancelledEvent, SubscriptionActivatedEvent} = require('@tryghost/member-events');
const {MilestoneCreatedEvent} = require('@tryghost/milestones');

// @NOTE: 'StaffService' is a vague name that does not describe what it's actually doing.
//         Possibly, "StaffNotificationService" or "StaffEventNotificationService" would be a more accurate name
class StaffService {
    constructor({logging, models, mailer, settingsCache, settingsHelpers, urlUtils, blogIcon, DomainEvents, labs, memberAttributionService}) {
        this.logging = logging;
        this.labs = labs;
        /** @private */
        this.settingsCache = settingsCache;
        this.models = models;
        this.DomainEvents = DomainEvents;
        this.memberAttributionService = memberAttributionService;

        const Emails = require('./StaffServiceEmails');

        this.emails = new Emails({
            logging,
            models,
            mailer,
            settingsHelpers,
            settingsCache,
            urlUtils,
            blogIcon,
            labs
        });
    }

    /** @private */
    getSerializedData({member, tier = null, subscription = null, offer = null}) {
        return {
            offer: offer ? {
                name: offer.name,
                type: offer.discount_type,
                currency: offer.currency,
                duration: offer.duration,
                durationInMonths: offer.duration_in_months,
                amount: offer.discount_amount
            } : null,
            subscription: subscription ? {
                id: subscription.id,
                amount: subscription.plan?.amount,
                interval: subscription.plan?.interval,
                currency: subscription.plan?.currency,
                startDate: subscription.start_date,
                cancelAt: subscription.current_period_end,
                cancellationReason: subscription.cancellation_reason
            } : null,
            member: member ? {
                id: member.id,
                name: member.name,
                email: member.email,
                geolocation: member.geolocation,
                status: member.status,
                created_at: member.created_at
            } : null,
            tier: tier ? {
                id: tier.id,
                name: tier.name
            } : null
        };
    }

    /** @private */
    async getDataFromIds({memberId, tierId = null, subscriptionId = null, offerId = null}) {
        const memberModel = memberId ? await this.models.Member.findOne({id: memberId}) : null;
        const tierModel = tierId ? await this.models.Product.findOne({id: tierId}) : null;
        const subscriptionModel = subscriptionId ? await this.models.StripeCustomerSubscription.findOne({id: subscriptionId}) : null;
        const offerModel = offerId ? await this.models.Offer.findOne({id: offerId}) : null;

        return this.getSerializedData({
            member: memberModel?.toJSON(),
            tier: tierModel?.toJSON(),
            subscription: subscriptionModel?.toJSON(),
            offer: offerModel?.toJSON()
        });
    }

    /** @private */
    async handleEvent(type, event) {
        if (type === MilestoneCreatedEvent && event.data.milestone) {
            await this.emails.notifyMilestoneReceived(event.data);
        }

        if (!['api', 'member'].includes(event.data.source)) {
            return;
        }

        const {member, tier, subscription, offer} = await this.getDataFromIds({
            memberId: event.data.memberId,
            tierId: event.data.tierId,
            subscriptionId: event.data.subscriptionId,
            offerId: event.data.offerId
        });

        if (type === MemberCreatedEvent && member.status === 'free') {
            let attribution;
            if (event.data?.attribution) {
                attribution = await this.memberAttributionService.fetchResource(event.data.attribution);
            } else {
                try {
                    attribution = await this.memberAttributionService.getMemberCreatedAttribution(event.data.memberId);
                } catch (e) {
                    this.logging.warn(`Failed to get attribution for member - ${event?.data?.memberId}`);
                }
            }
            await this.emails.notifyFreeMemberSignup({
                member,
                attribution
            });
        } else if (type === SubscriptionActivatedEvent) {
            let attribution;
            if (event.data?.attribution) {
                attribution = await this.memberAttributionService.fetchResource(event.data.attribution);
            } else {
                try {
                    attribution = await this.memberAttributionService.getSubscriptionCreatedAttribution(event.data.subscriptionId);
                } catch (e) {
                    this.logging.warn(`Failed to get attribution for member - ${event?.data?.memberId}`);
                }
            }
            await this.emails.notifyPaidSubscriptionStarted({
                member,
                offer,
                tier,
                subscription,
                attribution
            });
        } else if (type === SubscriptionCancelledEvent) {
            await this.emails.notifyPaidSubscriptionCanceled({
                member,
                tier,
                subscription,
                ...event.data
            });
        }
    }

    subscribeEvents() {
        // Trigger email for free member signup
        this.DomainEvents.subscribe(MemberCreatedEvent, async (event) => {
            try {
                await this.handleEvent(MemberCreatedEvent, event);
            } catch (e) {
                this.logging.error(e, `Failed to notify free member signup - ${event?.data?.memberId}`);
            }
        });

        // Trigger email on paid subscription start
        this.DomainEvents.subscribe(SubscriptionActivatedEvent, async (event) => {
            try {
                await this.handleEvent(SubscriptionActivatedEvent, event);
            } catch (e) {
                this.logging.error(e, `Failed to notify paid member subscription start - ${event?.data?.memberId}`);
            }
        });

        // Trigger email when a member cancels their subscription
        this.DomainEvents.subscribe(SubscriptionCancelledEvent, async (event) => {
            try {
                await this.handleEvent(SubscriptionCancelledEvent, event);
            } catch (e) {
                this.logging.error(e, `Failed to notify paid member subscription cancel - ${event?.data?.memberId}`);
            }
        });

        // Trigger email when a new milestone is reached
        this.DomainEvents.subscribe(MilestoneCreatedEvent, async (event) => {
            try {
                await this.handleEvent(MilestoneCreatedEvent, event);
            } catch (e) {
                this.logging.error(e, `Failed to notify milestone`);
            }
        });
    }
}

module.exports = StaffService;
