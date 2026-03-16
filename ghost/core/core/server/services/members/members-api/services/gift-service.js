const crypto = require('crypto');
const moment = require('moment');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const normalizeEmail = require('../utils/normalize-email');

const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing', 'unpaid', 'past_due'];
const ALLOWED_GIFT_DURATIONS = [1, 3, 6, 12];
const ALLOWED_GIFT_DELIVERY_METHODS = ['link', 'email'];

const messages = {
    invalidDuration: 'Invalid gift duration.',
    invalidDeliveryMethod: 'Invalid gift delivery method.',
    invalidRecipientEmail: 'Recipient email is not valid.',
    giftNotFound: 'This gift does not exist.',
    giftNotReady: 'This gift is not ready to redeem yet.',
    giftAlreadyRedeemed: 'This gift has already been redeemed.',
    activePaidSubscription: 'This gift can\'t be redeemed while you have an active paid subscription.',
    mismatchedRecipient: 'This gift can only be redeemed by the invited recipient.',
    tierChangeRequired: 'Redeeming the offer will change your current subscription to {tierName}.',
    activeGiftExists: 'You already have an active gift subscription on this tier.',
    tierArchived: 'This tier does not exist.',
    tierUnavailable: 'This tier is archived.'
};

module.exports = class GiftService {
    /**
     * @param {object} deps
     * @param {any} deps.MemberGift
     * @param {any} deps.memberRepository
     * @param {any} deps.productRepository
     */
    constructor({MemberGift, memberRepository, productRepository}) {
        this.MemberGift = MemberGift;
        this.memberRepository = memberRepository;
        this.productRepository = productRepository;
    }

    validateDuration(durationMonths) {
        const normalizedDuration = Number(durationMonths);

        if (!ALLOWED_GIFT_DURATIONS.includes(normalizedDuration)) {
            throw new errors.BadRequestError({
                message: tpl(messages.invalidDuration)
            });
        }

        return normalizedDuration;
    }

    validateDeliveryMethod(deliveryMethod = 'link') {
        const normalizedDeliveryMethod = (deliveryMethod || 'link').toLowerCase();

        if (!ALLOWED_GIFT_DELIVERY_METHODS.includes(normalizedDeliveryMethod)) {
            throw new errors.BadRequestError({
                message: tpl(messages.invalidDeliveryMethod)
            });
        }

        return normalizedDeliveryMethod;
    }

    calculateGiftPrice({tier, durationMonths}) {
        const normalizedDuration = this.validateDuration(durationMonths);
        const currency = tier.currency;

        if (normalizedDuration === 12) {
            const yearlyPrice = tier.getPrice('year');

            if (!yearlyPrice) {
                throw new errors.BadRequestError({
                    message: tpl(messages.invalidDuration)
                });
            }

            return {
                amount: yearlyPrice,
                currency
            };
        }

        const monthlyPrice = tier.getPrice('month');

        if (!monthlyPrice) {
            throw new errors.BadRequestError({
                message: tpl(messages.invalidDuration)
            });
        }

        return {
            amount: monthlyPrice * normalizedDuration,
            currency
        };
    }

    async getById(id, options = {}) {
        return await this.MemberGift.findOne({id}, options);
    }

    async getByToken(token, options = {}) {
        return await this.MemberGift.findOne({claim_token: token}, options);
    }

    async updateRecipientEmail({gift, recipientEmail}, options = {}) {
        const normalizedEmail = normalizeEmail(recipientEmail);

        if (!normalizedEmail) {
            throw new errors.BadRequestError({
                message: tpl(messages.invalidRecipientEmail)
            });
        }

        return await this.MemberGift.edit({
            recipient_email: normalizedEmail
        }, {
            ...options,
            id: gift.id
        });
    }

    async createPendingGift({recipientEmail = null, deliveryMethod = 'link', productId, durationMonths, amount, currency}, options = {}) {
        const normalizedDeliveryMethod = this.validateDeliveryMethod(deliveryMethod);
        const normalizedEmail = recipientEmail ? normalizeEmail(recipientEmail) : null;

        if (normalizedDeliveryMethod === 'email' && !normalizedEmail) {
            throw new errors.BadRequestError({
                message: tpl(messages.invalidRecipientEmail)
            });
        }

        const normalizedDuration = this.validateDuration(durationMonths);

        return await this.MemberGift.add({
            status: 'pending',
            claim_token: crypto.randomUUID(),
            delivery_method: normalizedDeliveryMethod,
            recipient_email: normalizedEmail,
            product_id: productId,
            duration_months: normalizedDuration,
            amount,
            currency: currency.toLowerCase()
        }, options);
    }

    async markPurchasedFromCheckoutSession(session, options = {}) {
        const giftId = session.metadata?.gift_id;

        if (!giftId) {
            return {gift: null, updated: false};
        }

        const gift = await this.getById(giftId, options);

        if (!gift) {
            throw new errors.NotFoundError({
                message: tpl(messages.giftNotFound)
            });
        }

        if (gift.get('status') !== 'pending') {
            return {gift, updated: false};
        }

        const updatedGift = await this.MemberGift.edit({
            status: 'purchased',
            purchaser_email: session.customer_details?.email ?? null,
            purchaser_name: session.customer_details?.name ?? null,
            stripe_checkout_session_id: session.id,
            stripe_payment_intent_id: session.payment_intent ?? null
        }, {
            ...options,
            id: gift.id
        });

        return {
            gift: updatedGift,
            updated: true
        };
    }

    async getActiveRedeemedGiftsForMember(memberId, options = {}) {
        const collection = await this.MemberGift
            .where({
                redeemed_by_member_id: memberId,
                status: 'redeemed'
            })
            .query((qb) => {
                qb.whereNull('ended_at');
                qb.andWhere('access_expires_at', '>', new Date());
                qb.orderBy('redeemed_at', 'DESC');
            })
            .fetchAll(options);

        return collection.models;
    }

    async getActiveRedeemedGiftForMember(memberId, options = {}) {
        const gifts = await this.getActiveRedeemedGiftsForMember(memberId, options);
        return gifts[0] || null;
    }

    _hasActivePaidSubscription(member) {
        return (member?.subscriptions || []).some((subscription) => {
            return !!subscription.id && ACTIVE_SUBSCRIPTION_STATUSES.includes(subscription.status);
        });
    }

    _getActiveComplimentarySubscription(member) {
        return (member?.subscriptions || []).find((subscription) => {
            return !subscription.id && ACTIVE_SUBSCRIPTION_STATUSES.includes(subscription.status);
        }) || null;
    }

    async redeemGift({token, member, confirmTierChange = false}, options = {}) {
        const gift = await this.getByToken(token, options);

        if (!gift) {
            throw new errors.NotFoundError({
                message: tpl(messages.giftNotFound)
            });
        }

        if (gift.get('status') === 'redeemed') {
            throw new errors.ConflictError({
                message: tpl(messages.giftAlreadyRedeemed),
                code: 'GIFT_ALREADY_REDEEMED'
            });
        }

        if (gift.get('status') !== 'purchased') {
            throw new errors.NoPermissionError({
                message: tpl(messages.giftNotReady),
                code: 'GIFT_NOT_READY'
            });
        }

        if (!member) {
            throw new errors.UnauthorizedError({
                message: tpl(messages.mismatchedRecipient),
                code: 'GIFT_AUTH_REQUIRED'
            });
        }

        const normalizedMemberEmail = normalizeEmail(member.email);

        if (gift.get('recipient_email') && (!normalizedMemberEmail || normalizedMemberEmail !== gift.get('recipient_email'))) {
            throw new errors.NoPermissionError({
                message: tpl(messages.mismatchedRecipient),
                code: 'GIFT_EMAIL_MISMATCH'
            });
        }

        if (member.status === 'paid' || this._hasActivePaidSubscription(member)) {
            throw new errors.NoPermissionError({
                message: tpl(messages.activePaidSubscription),
                code: 'GIFT_ACTIVE_PAID_SUBSCRIPTION'
            });
        }

        const tier = await this.productRepository.get({id: gift.get('product_id')}, options);

        if (!tier) {
            throw new errors.NotFoundError({
                message: tpl(messages.tierArchived)
            });
        }

        if (tier.get('active') !== true) {
            throw new errors.NoPermissionError({
                message: tpl(messages.tierUnavailable)
            });
        }

        const activeCompedSubscription = this._getActiveComplimentarySubscription(member);
        const activeGift = await this.getActiveRedeemedGiftForMember(member.id, options);
        const sameTier = activeCompedSubscription?.tier?.id === gift.get('product_id');

        if (sameTier && activeGift && activeGift.get('product_id') === gift.get('product_id')) {
            throw new errors.ConflictError({
                message: tpl(messages.activeGiftExists),
                code: 'GIFT_ALREADY_ACTIVE'
            });
        }

        if (activeCompedSubscription && !sameTier && !confirmTierChange) {
            throw new errors.ConflictError({
                message: tpl(messages.tierChangeRequired, {tierName: tier.get('name')}),
                code: 'GIFT_TIER_CHANGE_CONFIRMATION_REQUIRED'
            });
        }

        const baseMoment = (() => {
            if (sameTier && activeCompedSubscription?.tier?.expiry_at) {
                const currentExpiry = moment.utc(activeCompedSubscription.tier.expiry_at);

                if (currentExpiry.isAfter(moment.utc())) {
                    return currentExpiry;
                }
            }

            return moment.utc();
        })();

        const accessExpiresAt = baseMoment.clone().add(gift.get('duration_months'), 'months').toDate();

        if (activeGift && (!sameTier || activeGift.get('product_id') !== gift.get('product_id'))) {
            await this.MemberGift.edit({
                ended_at: new Date()
            }, {
                ...options,
                id: activeGift.id
            });
        }

        await this.memberRepository.update({
            products: [{
                id: gift.get('product_id'),
                expiry_at: accessExpiresAt
            }]
        }, {
            ...options,
            id: member.id
        });

        const redeemedGift = await this.MemberGift.edit({
            status: 'redeemed',
            redeemed_by_member_id: member.id,
            redeemed_at: new Date(),
            access_expires_at: accessExpiresAt,
            ended_at: null
        }, {
            ...options,
            id: gift.id
        });

        return {
            gift: redeemedGift,
            accessExpiresAt,
            sameTier,
            tierName: tier.get('name')
        };
    }
};
