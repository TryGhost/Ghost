import crypto from 'node:crypto';
import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import {Gift} from './gift';
import type {GiftRepository} from './gift-repository';
import tpl from '@tryghost/tpl';
import {GIFT_REMINDER_FLOOR_DAYS, GIFT_REMINDER_LEAD_DAYS} from './constants';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const GIFT_REMINDER_LEAD_MS = GIFT_REMINDER_LEAD_DAYS * MS_PER_DAY;
const GIFT_REMINDER_FLOOR_MS = GIFT_REMINDER_FLOOR_DAYS * MS_PER_DAY;

const errorMessages = {
    giftSubscriptionsNotEnabled: 'Gift subscriptions are not enabled on this site.',
    giftNotFound: 'This gift does not exist.',
    giftAlreadyRedeemed: 'This gift has already been redeemed.',
    giftConsumed: 'This gift has already been consumed.',
    giftExpired: 'This gift has expired.',
    giftRefunded: 'This gift has been refunded.',
    paidMember: 'You already have an active subscription.',
    giftInvalidReassignStatus: 'This gift does not have a reassignable status.',
    giftInvalidReassignMember: 'Member already has an active subscription.',
    giftAlreadyAssigned: 'This gift is already assigned to another member.',
    giftMissingConsumesAt: 'This gift is missing a "consumes at" date.',
    giftMemberAlreadyHasGift: 'Member already has a different active gift attached.'
};

interface MemberModel {
    id: string;
    get(key: 'email'): string;
    get(key: 'status'): string;
    get(key: 'name'): string | null;
    get(key: 'email_disabled'): boolean;
    get(key: string): unknown;
}

interface MemberRepository {
    get(filter: Record<string, unknown>, options?: Record<string, unknown>): Promise<MemberModel | null>;
    update(data: Record<string, unknown>, options?: Record<string, unknown>): Promise<unknown>;
}

type Tier = {
    name: string;
    currency: string | null;
    monthlyPrice: number | null;
    yearlyPrice: number | null;
    toJSON?: () => {
        id: string;
        name: string;
        description: string | null;
        benefits: string[];
    };
};

interface TiersService {
    api: {
        read(idString: string): Promise<Tier | null>;
    };
}

interface GiftEmailService {
    sendPurchaseConfirmation(data: {
        buyerEmail: string;
        token: string;
        tierName: string;
        cadence: 'month' | 'year';
        duration: number;
        expiresAt: Date;
    }): Promise<void>;
    sendReminder(data: {
        memberEmail: string;
        tierName: string;
        tierPrice: number;
        tierCurrency: string;
        cadence: 'month' | 'year';
        consumesAt: Date;
    }): Promise<void>;
}

interface StaffServiceEmails {
    notifyGiftReceived(data: {
        name: string | null;
        email: string;
        memberId: string | null;
        amount: number;
        currency: string;
        tierName: string;
        cadence: 'month' | 'year';
        duration: number;
    }): Promise<void>;
    notifyGiftSubscriptionStarted(data: {
        memberId: string;
        memberEmail: string;
        memberName: string | null;
        tierName: string;
        cadence: 'month' | 'year';
        duration: number;
        buyerEmail: string;
    }): Promise<void>;
}

export interface GiftPurchaseData {
    token: string;
    buyerEmail: string;
    stripeCustomerId: string | null;
    tierId: string;
    cadence: 'month' | 'year';
    duration: string;
    currency: string;
    amount: number;
    stripeCheckoutSessionId: string;
    stripePaymentIntentId: string;
}

interface SchedulerAdapter {
    schedule(job: {time: number; url: string; extra: {httpMethod: string}}): void;
}

interface SchedulerIntegration {
    api_keys: Array<{id: string; secret: string}>;
}

type GetSignedAdminToken = (options: {
    publishedAt: string;
    apiUrl: string;
    integration: SchedulerIntegration;
}) => string;

type UrlJoin = (...parts: string[]) => string;

interface GiftServiceDeps {
    giftRepository: GiftRepository;
    memberRepository: MemberRepository;
    tiersService: TiersService;
    giftEmailService: GiftEmailService;
    staffServiceEmails: StaffServiceEmails;
    schedulerAdapter: SchedulerAdapter | null;
    schedulerIntegration: SchedulerIntegration | null;
    getSignedAdminToken: GetSignedAdminToken | null;
    urlJoin: UrlJoin | null;
    apiUrl: string | null;
}

interface ReminderSend {
    memberEmail: string;
    cadence: 'month' | 'year';
    consumesAt: Date;
}

export class GiftService {
    private readonly deps: GiftServiceDeps;

    constructor(deps: GiftServiceDeps) {
        this.deps = deps;
    }

    generateToken(): string {
        /**
         * Combinations: 62^12 ≈ 3.23 × 10^21 (~3.23 sextillion)
         * Entropy:      12 × log2(62) ≈ 71.45 bits
         */
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let token = '';

        for (let i = 0; i < 12; i++) {
            token += alphabet[crypto.randomInt(alphabet.length)];
        }

        return token;
    }

    async recordPurchase(data: GiftPurchaseData): Promise<boolean> {
        const duration = Number.parseInt(data.duration);

        if (Number.isNaN(duration)) {
            throw new errors.ValidationError({message: `Invalid gift duration: ${data.duration}`});
        }

        if (await this.deps.giftRepository.existsByCheckoutSessionId(data.stripeCheckoutSessionId)) {
            return false;
        }

        const member = data.stripeCustomerId
            ? await this.deps.memberRepository.get({customer_id: data.stripeCustomerId})
            : null;

        const gift = Gift.fromPurchase({
            token: data.token,
            buyerEmail: data.buyerEmail,
            buyerMemberId: member?.id ?? null,
            tierId: data.tierId,
            cadence: data.cadence,
            duration,
            currency: data.currency,
            amount: data.amount,
            stripeCheckoutSessionId: data.stripeCheckoutSessionId,
            stripePaymentIntentId: data.stripePaymentIntentId
        });

        await this.deps.giftRepository.create(gift);

        const tier = await this.deps.tiersService.api.read(data.tierId);

        if (!tier) {
            throw new errors.NotFoundError({message: `Tier not found: ${data.tierId}`});
        }

        try {
            await this.deps.staffServiceEmails.notifyGiftReceived({
                name: member?.get('name') ?? null,
                email: member?.get('email') ?? data.buyerEmail,
                memberId: member?.id ?? null,
                amount: data.amount,
                currency: data.currency,
                tierName: tier.name,
                cadence: data.cadence,
                duration
            });
        } catch (err) {
            logging.error('Failed to notify staff of gift purchase', err);
        }

        try {
            await this.deps.giftEmailService.sendPurchaseConfirmation({
                buyerEmail: data.buyerEmail,
                token: data.token,
                tierName: tier.name,
                cadence: data.cadence,
                duration,
                expiresAt: gift.expiresAt
            });
        } catch (err) {
            logging.error('Failed to send gift purchase confirmation email', err);
        }

        return true;
    }

    async getByToken(token: string): Promise<Gift | null> {
        return this.deps.giftRepository.getByToken(token);
    }

    async assertRedeemable(gift: Gift, memberStatus: string | null): Promise<Gift> {
        const redeemableCheck = gift.checkRedeemable(memberStatus);

        if (!redeemableCheck.redeemable) {
            switch (redeemableCheck.reason) {
            case 'redeemed':
                throw new errors.BadRequestError({
                    message: tpl(errorMessages.giftAlreadyRedeemed),
                    code: 'GIFT_REDEEMED'
                });
            case 'consumed':
                throw new errors.BadRequestError({
                    message: tpl(errorMessages.giftConsumed),
                    code: 'GIFT_CONSUMED'
                });
            case 'expired':
                throw new errors.BadRequestError({
                    message: tpl(errorMessages.giftExpired),
                    code: 'GIFT_EXPIRED'
                });
            case 'refunded':
                throw new errors.BadRequestError({
                    message: tpl(errorMessages.giftRefunded),
                    code: 'GIFT_REFUNDED'
                });
            case 'paid-member':
                throw new errors.BadRequestError({
                    message: tpl(errorMessages.paidMember),
                    code: 'GIFT_PAID_MEMBER'
                });
            default: {
                const exhaustiveCheck: never = redeemableCheck.reason;

                throw new errors.InternalServerError({
                    message: `Unhandled redeem failure reason: ${exhaustiveCheck}`
                });
            }
            }
        }

        return gift;
    }

    async getRedeemable(token: string, memberStatus: string | null): Promise<Gift> {
        const gift = await this.deps.giftRepository.getByToken(token);

        if (!gift) {
            throw new errors.NotFoundError({message: tpl(errorMessages.giftNotFound)});
        }

        await this.assertRedeemable(gift, memberStatus);

        return gift;
    }

    async redeem(token: string, memberId: string, options: {transacting?: {executionPromise: Promise<unknown>}; newMember?: boolean} = {}): Promise<Gift> {
        const run = async (transacting: unknown) => {
            const member = await this.deps.memberRepository.get({id: memberId}, {transacting, forUpdate: true});
            if (!member) {
                throw new errors.NotFoundError({message: `Member not found: ${memberId}`});
            }

            const gift = await this.deps.giftRepository.getByToken(token, {transacting, forUpdate: true});
            if (!gift) {
                throw new errors.NotFoundError({message: tpl(errorMessages.giftNotFound)});
            }

            if (options.newMember) {
                await this.assertRedeemable(gift, null);
            } else {
                await this.assertRedeemable(gift, member.get('status'));
            }

            const redeemed = gift.redeem({memberId});

            await this.deps.memberRepository.update({
                products: [{
                    id: redeemed.tierId,
                    expiry_at: redeemed.consumesAt
                }],
                status: 'gift'
            }, {id: memberId, transacting});

            await this.deps.giftRepository.update(redeemed, {transacting});

            return {redeemed, member};
        };

        const {redeemed, member} = options.transacting
            ? await run(options.transacting)
            : await this.deps.giftRepository.transaction(run);

        const notify = async () => {
            try {
                const tier = await this.deps.tiersService.api.read(redeemed.tierId);

                if (!tier) {
                    throw new errors.NotFoundError({message: `Tier not found: ${redeemed.tierId}`});
                }

                await this.deps.staffServiceEmails.notifyGiftSubscriptionStarted({
                    memberId: member.id,
                    memberEmail: member.get('email'),
                    memberName: member.get('name'),
                    tierName: tier.name,
                    cadence: redeemed.cadence,
                    duration: redeemed.duration,
                    buyerEmail: redeemed.buyerEmail
                });
            } catch (err) {
                logging.error('Failed to notify staff of gift redemption', err);
            }

            this.scheduleReminder(redeemed);
        };

        if (options.transacting) {
            // Only notify once the transaction has finished
            options.transacting.executionPromise.then(notify, () => {});
        } else {
            await notify();
        }

        return redeemed;
    }

    async getActiveByMember(memberId: string, options: {transacting?: unknown} = {}): Promise<Gift | null> {
        if (!memberId) {
            return null;
        }
        return this.deps.giftRepository.getActiveByMember(memberId, options);
    }

    async getActiveByMembers(memberIds: string[], options: {transacting?: unknown} = {}): Promise<Map<string, Gift>> {
        if (!memberIds || memberIds.length === 0) {
            return new Map();
        }
        return this.deps.giftRepository.getActiveByMembers(memberIds, options);
    }

    getRemainingActiveDays(gift: Gift, now: Date = new Date()): number {
        if (!gift.isRedeemed() || !gift.consumesAt || gift.isConsumed()) {
            return 0;
        }

        const diffDays = Math.ceil((gift.consumesAt.getTime() - now.getTime()) / MS_PER_DAY);

        return Math.max(0, diffDays);
    }

    async reassignRedeemer(
        giftId: string,
        memberId: string,
        options: {transacting?: unknown} = {}
    ): Promise<Gift> {
        const run = async (transacting: unknown): Promise<Gift> => {
            const gift = await this.deps.giftRepository.getById(giftId, {transacting, forUpdate: true});

            if (!gift) {
                throw new errors.NotFoundError({message: tpl(errorMessages.giftNotFound)});
            }

            if (gift.redeemerMemberId === memberId) {
                return gift;
            }

            const check = gift.checkReassignable();

            if (!check.reassignable) {
                switch (check.reason) {
                case 'assigned':
                    throw new errors.BadRequestError({message: tpl(errorMessages.giftAlreadyAssigned)});
                case 'unredeemed':
                case 'consumed':
                case 'expired':
                case 'refunded':
                    throw new errors.BadRequestError({message: tpl(errorMessages.giftInvalidReassignStatus)});
                case 'missing-consumes-at':
                    throw new errors.BadRequestError({message: tpl(errorMessages.giftMissingConsumesAt)});
                default: {
                    const exhaustiveCheck: never = check.reason;

                    throw new errors.InternalServerError({
                        message: `Unhandled reassign failure reason: ${exhaustiveCheck}`
                    });
                }
                }
            }

            const member = await this.deps.memberRepository.get(
                {id: memberId},
                {transacting, forUpdate: true}
            );

            if (!member) {
                throw new errors.NotFoundError({message: `Member not found: ${memberId}`});
            }

            const memberStatus = member.get('status');
            if (memberStatus !== 'free' && memberStatus !== 'gift') {
                throw new errors.BadRequestError({message: tpl(errorMessages.giftInvalidReassignMember)});
            }

            const existingActiveGift = await this.deps.giftRepository.getActiveByMember(memberId, {transacting});
            if (existingActiveGift && existingActiveGift.token !== gift.token) {
                throw new errors.BadRequestError({message: tpl(errorMessages.giftMemberAlreadyHasGift)});
            }

            const reassignedGift = gift.reassignRedeemer(memberId);

            await this.deps.memberRepository.update({
                products: [{
                    id: reassignedGift.tierId,
                    expiry_at: reassignedGift.consumesAt
                }],
                status: 'gift'
            }, {id: memberId, transacting});

            await this.deps.giftRepository.update(reassignedGift, {transacting});

            return reassignedGift;
        };

        return options.transacting
            ? run(options.transacting)
            : this.deps.giftRepository.transaction(run);
    }

    async refund(paymentIntentId: string): Promise<boolean> {
        const gift = await this.deps.giftRepository.getByPaymentIntentId(paymentIntentId);

        if (!gift) {
            return false;
        }

        const refunded = gift.refund();

        if (!refunded) {
            return true;
        }

        await this.deps.giftRepository.transaction(async (transacting) => {
            await this.deps.giftRepository.update(refunded, {transacting});

            if (gift.redeemerMemberId) {
                const member = await this.deps.memberRepository.get({id: gift.redeemerMemberId}, {transacting});

                if (member?.get('status') === 'gift') {
                    await this.deps.memberRepository.update({
                        products: [],
                        status: 'free'
                    }, {id: gift.redeemerMemberId, transacting});
                }
            }
        });

        return true;
    }

    async consume(token: string, options: {transacting?: unknown} = {}): Promise<Gift | null> {
        const run = async (transacting: unknown) => {
            // Fetch with a row lock to prevent race conditions under concurrency
            const gift = await this.deps.giftRepository.getByToken(token, {transacting, forUpdate: true});

            if (!gift || gift.status !== 'redeemed') {
                return null;
            }

            const consumed = gift.consume();

            if (!consumed) {
                return null;
            }

            await this.deps.giftRepository.update(consumed, {transacting});

            return consumed;
        };

        return options.transacting
            ? await run(options.transacting)
            : await this.deps.giftRepository.transaction(run);
    }

    async processConsumed(): Promise<{consumedCount: number; updatedMemberCount: number}> {
        const toConsume = await this.deps.giftRepository.findPendingConsumption();

        if (toConsume.length === 0) {
            return {consumedCount: 0, updatedMemberCount: 0};
        }

        let consumedCount = 0;
        let updatedMemberCount = 0;

        for (const gift of toConsume) {
            await this.deps.giftRepository.transaction(async (transacting) => {
                const consumed = await this.consume(gift.token, {transacting});

                if (!consumed) {
                    return;
                }

                const member = await this.deps.memberRepository.get({id: consumed.redeemerMemberId}, {transacting, forUpdate: true});

                if (member && member.get('status') === 'gift') {
                    await this.deps.memberRepository.update({
                        products: [],
                        status: 'free'
                    }, {id: consumed.redeemerMemberId, transacting});

                    updatedMemberCount += 1;
                }

                consumedCount += 1;
            });
        }

        return {consumedCount, updatedMemberCount};
    }

    async processExpired(): Promise<{expiredCount: number}> {
        const toExpire = await this.deps.giftRepository.findPendingExpiration();

        if (toExpire.length === 0) {
            return {expiredCount: 0};
        }

        let expiredCount = 0;

        for (const gift of toExpire) {
            await this.deps.giftRepository.transaction(async (transacting) => {
                // Re-fetch with a row lock to prevent races with concurrent redeems / refunds
                const locked = await this.deps.giftRepository.getByToken(gift.token, {transacting, forUpdate: true});

                if (locked?.status !== 'purchased') {
                    return;
                }

                const expired = locked.expire();

                if (!expired) {
                    return;
                }

                await this.deps.giftRepository.update(expired, {transacting});

                expiredCount += 1;
            });
        }

        return {expiredCount};
    }

    private scheduleReminder(gift: Gift): void {
        const {schedulerAdapter, schedulerIntegration, getSignedAdminToken, urlJoin, apiUrl} = this.deps;

        if (!schedulerAdapter || !schedulerIntegration || !getSignedAdminToken || !urlJoin || !apiUrl) {
            return;
        }

        if (!gift.consumesAt) {
            return;
        }

        const time = gift.consumesAt.getTime() - GIFT_REMINDER_LEAD_MS;

        if (time <= Date.now()) {
            return;
        }

        try {
            const signedAdminToken = getSignedAdminToken({
                publishedAt: new Date(time).toISOString(),
                apiUrl,
                integration: schedulerIntegration
            });

            const url = new URL(urlJoin(apiUrl, 'gifts', 'flush_reminders'));
            url.searchParams.set('token', signedAdminToken);

            schedulerAdapter.schedule({
                time,
                url: url.toString(),
                extra: {httpMethod: 'PUT'}
            });
        } catch (err) {
            logging.error('Failed to schedule gift reminder', err);
        }
    }

    async processReminders(): Promise<{remindedCount: number; skippedCount: number; failedCount: number}> {
        const now = new Date();
        const toRemind = await this.deps.giftRepository.findPendingReminder({
            now,
            reminderLeadMs: GIFT_REMINDER_LEAD_MS,
            reminderFloorMs: GIFT_REMINDER_FLOOR_MS
        });

        if (toRemind.length === 0) {
            return {remindedCount: 0, skippedCount: 0, failedCount: 0};
        }

        let remindedCount = 0;
        let skippedCount = 0;
        let failedCount = 0;

        for (const gift of toRemind) {
            try {
                const sent = await this.sendReminderForGift(gift.token);

                if (sent) {
                    remindedCount += 1;
                } else {
                    skippedCount += 1;
                }
            } catch (err) {
                logging.error(err);

                failedCount += 1;
            }
        }

        return {remindedCount, skippedCount, failedCount};
    }

    private async sendReminderForGift(token: string): Promise<boolean> {
        const gift = await this.deps.giftRepository.getByToken(token);

        if (!gift) {
            return false;
        }

        const tier = await this.deps.tiersService.api.read(gift.tierId);

        if (!tier) {
            throw new errors.NotFoundError({message: `Tier not found for gift: ${gift.tierId}`});
        }

        // Throw before the transaction so the gift isn't marked as reminded;
        // the next run recovers after an admin restores pricing.
        const tierPrice = gift.cadence === 'month' ? tier.monthlyPrice : tier.yearlyPrice;

        if (tierPrice === null || tier.currency === null) {
            throw new errors.NotFoundError({
                message: `Tier missing ${gift.cadence}ly pricing for gift: ${gift.tierId}`
            });
        }

        const result = await this.deps.giftRepository.transaction(async (transacting): Promise<ReminderSend | null> => {
            const locked = await this.deps.giftRepository.getByToken(token, {transacting, forUpdate: true});

            if (!locked) {
                return null;
            }

            if (
                // Gift must still be active — a concurrent refund or early consume can happen
                // between `findPendingReminder` and this re-read.
                locked.status !== 'redeemed'
                // Idempotency guard: another path (rerun, scheduler) may already have sent.
                || locked.consumesSoonReminderSentAt !== null
                // Narrows `redeemerMemberId` from `string | null` to `string` — always set for redeemed gifts.
                || locked.redeemerMemberId === null
                // Narrows `consumesAt` from `Date | null` to `Date` — always set for redeemed gifts.
                || locked.consumesAt === null
            ) {
                return null;
            }

            const member = await this.deps.memberRepository.get(
                {id: locked.redeemerMemberId},
                {transacting, forUpdate: true}
            );

            // Record the reminder as sent before any skip or send below so we don't
            // re-try gifts with permanently unreachable redeemers on every poll.
            const reminded = locked.remind();

            if (!reminded) {
                return null;
            }

            await this.deps.giftRepository.update(reminded, {transacting});

            if (!member) {
                return null;
            }

            if (member.get('email_disabled')) {
                return null;
            }

            return {
                memberEmail: member.get('email'),
                cadence: locked.cadence,
                consumesAt: locked.consumesAt
            };
        });

        if (!result) {
            return false;
        }

        await this.deps.giftEmailService.sendReminder({
            memberEmail: result.memberEmail,
            tierName: tier.name,
            tierPrice,
            tierCurrency: tier.currency,
            cadence: result.cadence,
            consumesAt: result.consumesAt
        });

        return true;
    }
}
