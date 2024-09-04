const {DonationPaymentEvent} = require('@tryghost/donations');
const _ = require('lodash');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');

module.exports = class CheckoutSessionEventService {
    /**
     * 
     * * @param {import('./StripeAPI')} deps.api
     * @param {import('@tryghost/members-api').MemberRepository} deps.memberRepository
     * @param {import('@tryghost/donations').DonationRepository} deps.donationRepository
     * @param {import('@tryghost/staff-service').StaffServiceEmails} deps.staffServiceEmails
     */
    constructor({api, memberRepository, donationRepository, staffServiceEmails}) {
        this.api = api;
        this.memberRepository = memberRepository;
        this.donationRepository = donationRepository;
        this.staffServiceEmails = staffServiceEmails;
    }

    async handleEvent(session) {
        if (session.mode === 'setup') {
            return this.handleSetupEvent(session);
        }

        if (session.mode === 'subscription') {
            return this.handleSubscriptionEvent(session);
        }

        if (session.mode === 'payment' && session.metadata?.ghost_donation) {
            return this.handleDonationEvent(session);
        }
    }

    async handleDonationEvent(session) {
        const donationField = session.custom_fields?.find(obj => obj?.key === 'donation_message');

        const donationMessage = donationField?.text?.value ? donationField.text.value : null;

        const amount = session.amount_total;
        const currency = session.currency;
        const member = session.customer ? (await this.memberRepository.get({
            customer_id: session.customer
        })) : null;

        const data = DonationPaymentEvent.create({
            name: member?.get('name') ?? session.customer_details.name,
            email: member?.get('email') ?? session.customer_details.email,
            memberId: member?.id ?? null,
            amount,
            currency,
            donationMessage,
            attributionId: session.metadata.attribution_id ?? null,
            attributionUrl: session.metadata.attribution_url ?? null,
            attributionType: session.metadata.attribution_type ?? null,
            referrerSource: session.metadata.referrer_source ?? null,
            referrerMedium: session.metadata.referrer_medium ?? null,
            referrerUrl: session.metadata.referrer_url ?? null
        });

        await this.donationRepository.save(data);
        await this.staffServiceEmails.notifyDonationReceived({
            donationPaymentEvent: data
        });
    }

    async handleSetupEvent(session) {
        const setupIntent = await this.api.getSetupIntent(session.setup_intent);
        const member = await this.memberRepository.get({
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
                await this.memberRepository.linkSubscription({
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

        const activeSubscriptions = subscriptions.models.filter((subscription) => {
            return ['active', 'trialing', 'unpaid', 'past_due'].includes(subscription.get('status'));
        });

        for (const subscription of activeSubscriptions) {
            if (subscription.get('customer_id') === setupIntent.metadata.customer_id) {
                const updatedSubscription = await this.api.updateSubscriptionDefaultPaymentMethod(
                    subscription.get('subscription_id'),
                    setupIntent.payment_method
                );
                try {
                    await this.memberRepository.linkSubscription({
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

    async handleSubscriptionEvent(session) {
        const customer = await this.api.getCustomer(session.customer, {
            expand: ['subscriptions.data.default_payment_method']
        });

        let member = await this.memberRepository.get({
            email: customer.email
        });

        const checkoutType = _.get(session, 'metadata.checkoutType');

        if (!member) {
            const metadataName = _.get(session, 'metadata.name');
            const metadataNewsletters = _.get(session, 'metadata.newsletters');
            const attribution = {
                id: session.metadata.attribution_id ?? null,
                url: session.metadata.attribution_url ?? null,
                type: session.metadata.attribution_type ?? null,
                referrerSource: session.metadata.referrer_source ?? null,
                referrerMedium: session.metadata.referrer_medium ?? null,
                referrerUrl: session.metadata.referrer_url ?? null
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
            member = await this.memberRepository.create(memberDataWithStripeCustomer);
        } else {
            const payerName = _.get(customer, 'subscriptions.data[0].default_payment_method.billing_details.name');
            const attribution = {
                id: session.metadata?.attribution_id ?? null,
                url: session.metadata?.attribution_url ?? null,
                type: session.metadata?.attribution_type ?? null,
                referrerSource: session.metadata.referrer_source ?? null,
                referrerMedium: session.metadata.referrer_medium ?? null,
                referrerUrl: session.metadata.referrer_url ?? null
            };

            if (payerName && !member.get('name')) {
                await this.memberRepository.update({name: payerName}, {id: member.get('id')});
            }

            await this.memberRepository.upsertCustomer({
                customer_id: customer.id,
                member_id: member.id,
                name: customer.name,
                email: customer.email
            });

            for (const subscription of customer.subscriptions.data) {
                try {
                    const offerId = session.metadata?.offer;

                    await this.memberRepository.linkSubscription({
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
            this.sendSignupEmail(customer.email);
        }
    }
};
