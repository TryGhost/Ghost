const {DonationPaymentEvent} = require('@tryghost/donations');
const _ = require('lodash');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');

/**
 * Handles `checkout.session.completed` webhook events
 *
 * The `checkout.session.completed` event is triggered when a customer completes a checkout session.
 *
 * It is triggered for the following scenarios:
 * - Subscription
 * - Donation
 * - Setup intent
 *
 * This service delegates the event to the appropriate handler based on the session mode and metadata.
 *
 * The `session` payload can be found here: https://docs.stripe.com/api/checkout/sessions/object
 */
module.exports = class CheckoutSessionEventService {
    /**
     * @param {object} deps
     * @param {import('../../StripeAPI')} deps.api
     * @param {object} deps.memberRepository
     * @param {object} deps.donationRepository
     * @param {object} deps.staffServiceEmails
     * @param {function} deps.sendSignupEmail
     */
    constructor(deps) {
        this.api = deps.api;
        this.deps = deps;
    }

    /**
     * Handles a `checkout.session.completed` event
     * Delegates to the appropriate handler based on the session mode and metadata
     * @param {import('stripe').Stripe.Checkout.Session} session
     */
    async handleEvent(session) {
        if (session.mode === 'setup') {
            await this.handleSetupEvent(session);
        }

        if (session.mode === 'subscription') {
            await this.handleSubscriptionEvent(session);
        }

        if (session.mode === 'payment' && session.metadata?.ghost_donation) {
            await this.handleDonationEvent(session);
        }
    }

    /**
     * Handles a `checkout.session.completed` event for a donation
     * @param {import('stripe').Stripe.Checkout.Session} session
     */
    async handleDonationEvent(session) {
        const donationField = session.custom_fields?.find(obj => obj?.key === 'donation_message');
        const donationMessage = donationField?.text?.value ? donationField.text.value : null;
        const amount = session.amount_total;
        const currency = session.currency;

        const memberRepository = this.deps.memberRepository;
        const member = session.customer ? (await memberRepository.get({customer_id: session.customer})) : null;

        const data = DonationPaymentEvent.create({
            name: member?.get('name') ?? session.customer_details.name,
            email: member?.get('email') ?? session.customer_details.email,
            memberId: member?.id ?? null,
            amount,
            currency,
            donationMessage,
            attributionId: session.metadata?.attribution_id ?? null,
            attributionUrl: session.metadata?.attribution_url ?? null,
            attributionType: session.metadata?.attribution_type ?? null,
            referrerSource: session.metadata?.referrer_source ?? null,
            referrerMedium: session.metadata?.referrer_medium ?? null,
            referrerUrl: session.metadata?.referrer_url ?? null
        });

        const donationRepository = this.deps.donationRepository;
        await donationRepository.save(data);

        const staffServiceEmails = this.deps.staffServiceEmails;
        await staffServiceEmails.notifyDonationReceived({donationPaymentEvent: data});
    }

    /**
     * Handles a `checkout.session.completed` event for a setup intent
     *
     * This is used when a customer adds or changes their payment method outside
     * of the normal subscription flow.
     * @param {import('stripe').Stripe.Checkout.Session} session
     */
    async handleSetupEvent(session) {
        const setupIntent = await this.api.getSetupIntent(session.setup_intent);

        const memberRepository = this.deps.memberRepository;
        const member = await memberRepository.get({
            customer_id: setupIntent.metadata.customer_id
        });

        if (!member) {
            return;
        }

        await this.api.attachPaymentMethodToCustomer(
            setupIntent.metadata.customer_id,
            setupIntent.payment_method
        );

        if (setupIntent.metadata.subscription_id) {
            const updatedSubscription = await this.api.updateSubscriptionDefaultPaymentMethod(
                setupIntent.metadata.subscription_id,
                setupIntent.payment_method
            );
            try {
                await memberRepository.linkSubscription({
                    id: member.id,
                    subscription: updatedSubscription
                });
            } catch (err) {
                if (err.code !== 'ER_DUP_ENTRY' && err.code !== 'SQLITE_CONSTRAINT') {
                    throw err;
                }
                throw new errors.ConflictError({
                    err
                });
            }
            return;
        }

        const subscriptions = await member.related('stripeSubscriptions').fetch();
        const activeSubscriptions = subscriptions.models.filter(subscription => ['active', 'trialing', 'unpaid', 'past_due'].includes(subscription.get('status'))
        );

        for (const subscription of activeSubscriptions) {
            if (subscription.get('customer_id') === setupIntent.metadata.customer_id) {
                const updatedSubscription = await this.api.updateSubscriptionDefaultPaymentMethod(
                    subscription.get('subscription_id'),
                    setupIntent.payment_method
                );
                try {
                    await memberRepository.linkSubscription({
                        id: member.id,
                        subscription: updatedSubscription
                    });
                } catch (err) {
                    if (err.code !== 'ER_DUP_ENTRY' && err.code !== 'SQLITE_CONSTRAINT') {
                        throw err;
                    }
                    throw new errors.ConflictError({
                        err
                    });
                }
            }
        }
    }

    /**
     * Handles a `checkout.session.completed` event for a subscription
     * @param {import('stripe').Stripe.Checkout.Session} session
     */
    async handleSubscriptionEvent(session) {
        const customer = await this.api.getCustomer(session.customer, {
            expand: ['subscriptions.data.default_payment_method']
        });

        const memberRepository = this.deps.memberRepository;

        let member = await memberRepository.get({
            email: customer.email
        });

        const checkoutType = _.get(session, 'metadata.checkoutType');

        if (!member) {
            const metadataName = _.get(session, 'metadata.name');
            const metadataNewsletters = _.get(session, 'metadata.newsletters');
            const attribution = {
                id: session.metadata?.attribution_id ?? null,
                url: session.metadata?.attribution_url ?? null,
                type: session.metadata?.attribution_type ?? null,
                referrerSource: session.metadata?.referrer_source ?? null,
                referrerMedium: session.metadata?.referrer_medium ?? null,
                referrerUrl: session.metadata?.referrer_url ?? null
            };

            const payerName = _.get(customer, 'subscriptions.data[0].default_payment_method.billing_details.name');
            const name = metadataName || payerName || null;

            const memberData = {email: customer.email, name, attribution};
            if (metadataNewsletters) {
                try {
                    memberData.newsletters = JSON.parse(metadataNewsletters);
                } catch (e) {
                    logging.error(`Ignoring invalid newsletters data - ${metadataNewsletters}.`);
                }
            }

            const offerId = session.metadata?.offer;
            const memberDataWithStripeCustomer = {
                ...memberData,
                stripeCustomer: customer,
                offerId
            };
            member = await memberRepository.create(memberDataWithStripeCustomer);
        } else {
            const payerName = _.get(customer, 'subscriptions.data[0].default_payment_method.billing_details.name');
            const attribution = {
                id: session.metadata?.attribution_id ?? null,
                url: session.metadata?.attribution_url ?? null,
                type: session.metadata?.attribution_type ?? null,
                referrerSource: session.metadata?.referrer_source ?? null,
                referrerMedium: session.metadata?.referrer_medium ?? null,
                referrerUrl: session.metadata?.referrer_url ?? null
            };

            if (payerName && !member.get('name')) {
                await memberRepository.update({name: payerName}, {id: member.get('id')});
            }

            await memberRepository.upsertCustomer({
                customer_id: customer.id,
                member_id: member.id,
                name: customer.name,
                email: customer.email
            });

            for (const subscription of customer.subscriptions.data) {
                try {
                    const offerId = session.metadata?.offer;

                    await memberRepository.linkSubscription({
                        id: member.id,
                        subscription,
                        offerId,
                        attribution
                    });
                } catch (err) {
                    if (err.code !== 'ER_DUP_ENTRY' && err.code !== 'SQLITE_CONSTRAINT') {
                        throw err;
                    }
                    throw new errors.ConflictError({
                        err
                    });
                }
            }
        }

        if (checkoutType !== 'upgrade') {
            this.deps.sendSignupEmail(customer.email);
        }
    }
};
