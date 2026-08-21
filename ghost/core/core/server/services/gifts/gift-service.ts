import crypto from 'node:crypto';
import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import type { Knex } from 'knex';
import { DateTime } from 'luxon';
import { z } from 'zod';
import { Gift } from './gift';
import type {
  GiftEventBrowseOptions,
  GiftEventPage,
  GiftRepository,
} from './gift-bookshelf-repository';
import type { GiftDeliveryService } from './gift-delivery-service';
import type { GiftReminderScheduler } from './gift-reminder-scheduler';
import { GiftCadenceSchema, type GiftCadence } from './gift-schema';
import tpl from '@tryghost/tpl';
import { GIFT_EXPIRY_DAYS, GIFT_REMINDER_FLOOR_DAYS, GIFT_REMINDER_LEAD_DAYS } from './constants';
import {
  resolveGiftDuration,
  validateGiftCheckoutOffer,
  type GiftCheckoutTier,
  type ResolvedGiftDuration,
} from './gift-checkout-offer';

const DEFAULT_TIMEZONE = 'Etc/UTC';
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const GIFT_REMINDER_LEAD_MS = GIFT_REMINDER_LEAD_DAYS * MS_PER_DAY;
const GIFT_REMINDER_FLOOR_MS = GIFT_REMINDER_FLOOR_DAYS * MS_PER_DAY;
const GIFT_NAME_MAX_LENGTH = 191;
const GIFT_EMAIL_MAX_LENGTH = 191;
const GIFT_CHECKOUT_MESSAGE_MAX_LENGTH = 250;
const GIFT_CHECKOUT_RETENTION_DAYS = 30;

const errorMessages = {
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
  giftMemberAlreadyHasGift: 'Member already has a different active gift attached.',
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
  get(
    filter: Record<string, unknown>,
    options?: Record<string, unknown>,
  ): Promise<MemberModel | null>;
  update(data: Record<string, unknown>, options?: Record<string, unknown>): Promise<unknown>;
  triggerMemberSignupAutomation(
    memberId: string,
    memberEmail: string,
    memberStatus: 'free' | 'paid',
    options?: Record<string, unknown>,
  ): Promise<unknown>;
}

type Tier = Omit<GiftCheckoutTier, 'currency'> & {
  id:
    | string
    | {
        toHexString(): string;
      };
  name: string;
  currency: string;
  getPrice(cadence: GiftCadence): number;
  toJSON(): {
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
    cadence: GiftCadence;
    duration: number;
    expiresAt: Date;
    recipientEmail?: string | null;
  }): Promise<void>;
  sendReminder(data: {
    memberEmail: string;
    memberName: string | null;
    tierName: string;
    consumesAt: Date;
  }): Promise<void>;
}

interface StaffServiceEmails {
  notifyGiftPurchased(data: {
    name: string | null;
    email: string;
    memberId: string | null;
    amount: number;
    currency: string;
    tierName: string;
    cadence: GiftCadence;
    duration: number;
  }): Promise<void>;
  notifyGiftSubscriptionStarted(data: {
    memberId: string;
    memberEmail: string;
    memberName: string | null;
    tierName: string;
    cadence: GiftCadence;
    duration: number;
    buyerEmail: string;
  }): Promise<void>;
}

const GiftPurchaseDataSchema = z.object({
  token: z.string().min(1),
  buyerEmail: z.string().min(1),
  stripeCustomerId: z.string().min(1).nullable(),
  tierId: z.string().min(1),
  cadence: GiftCadenceSchema,
  duration: z.number().int().positive(),
  currency: z.string().min(1),
  amount: z.number().int().nonnegative(),
  stripeCheckoutSessionId: z.string().min(1),
  stripePaymentIntentId: z.string().min(1),
});

export type GiftPurchaseData = z.input<typeof GiftPurchaseDataSchema>;

const StripeBuyerEmailSchema = z.unknown().transform((value): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const email = value.trim();
  return email && email.length <= GIFT_EMAIL_MAX_LENGTH ? email : null;
});

const GiftPaymentCompletionSchema = z.object({
  giftId: z.string().min(1),
  buyerEmail: StripeBuyerEmailSchema,
  stripeCustomerId: z.string().min(1).nullable(),
  stripeCheckoutSessionId: z.string().min(1),
  stripePaymentIntentId: z.string().min(1),
});

export type GiftPaymentCompletionData = z.input<typeof GiftPaymentCompletionSchema>;

interface GiftServiceDeps {
  giftRepository: GiftRepository;
  giftDeliveryService: Pick<
    GiftDeliveryService,
    'createForCheckout' | 'dispatchForGift' | 'cancelPendingForGift'
  >;
  memberRepository: MemberRepository;
  tiersService: TiersService;
  giftEmailService: GiftEmailService;
  staffServiceEmails: StaffServiceEmails;
  giftReminderScheduler: Pick<GiftReminderScheduler, 'scheduleFor'>;
  checkoutAdapter: {
    getCustomerId(buyer: GiftCheckoutBuyer): Promise<string | null>;
    createSession(data: GiftCheckoutSession): Promise<{ id: string; url: string }>;
  };
  labsService: {
    isSet(flag: string): boolean;
  };
  settingsCache: {
    get(key: string): unknown;
  };
}

interface ReminderSend {
  memberEmail: string;
  memberName: string | null;
  consumesAt: Date;
}

export interface GiftCheckoutBuyer {
  memberId: string | null;
  email: string | null;
  name: string | null;
  isAuthenticated: boolean;
}

export interface StartGiftCheckoutInput {
  tierId?: string;
  offerId?: string;
  cadence?: string;
  duration?: number;
  deliveryMethod?: unknown;
  recipientEmail?: unknown;
  recipientName?: unknown;
  buyerName?: unknown;
  personalMessage?: unknown;
  successUrl: string;
  cancelUrl?: string;
  buyer: GiftCheckoutBuyer;
}

const NullableCheckoutStringSchema = (max: number) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
    z.string().trim().max(max).nullable().optional().default(null),
  );

const EmptyCheckoutStringSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
  z.null().optional().default(null),
);

const RequiredCheckoutStringSchema = (max: number) => z.string().trim().min(1).max(max);
const CheckoutBuyerEmailSchema = z.string().trim().email().max(GIFT_EMAIL_MAX_LENGTH);

const GiftCheckoutDeliverySchema = z.discriminatedUnion('deliveryMethod', [
  z.object({
    deliveryMethod: z.literal('link'),
    recipientEmail: EmptyCheckoutStringSchema,
    recipientName: EmptyCheckoutStringSchema,
    personalMessage: EmptyCheckoutStringSchema,
    buyerName: NullableCheckoutStringSchema(GIFT_NAME_MAX_LENGTH),
  }),
  z.object({
    deliveryMethod: z.literal('email'),
    recipientEmail: z.string().trim().email().max(GIFT_EMAIL_MAX_LENGTH),
    recipientName: NullableCheckoutStringSchema(GIFT_NAME_MAX_LENGTH),
    personalMessage: NullableCheckoutStringSchema(GIFT_CHECKOUT_MESSAGE_MAX_LENGTH),
    buyerName: RequiredCheckoutStringSchema(GIFT_NAME_MAX_LENGTH),
  }),
]);

type GiftCheckoutDelivery = z.infer<typeof GiftCheckoutDeliverySchema>;

interface GiftCheckoutSession {
  amount: number;
  currency: string;
  tierName: string;
  cadence: GiftCadence;
  duration: number;
  metadata: Record<string, unknown>;
  successUrl: string;
  cancelUrl?: string;
  customerId: string | null;
  customerEmail: string | null;
  idempotencyKey: string;
}

export interface GiftRedemption {
  token: string;
  cadence: GiftCadence;
  duration: number;
  currency: string;
  amount: number;
  buyer_name: string | null;
  recipient_name: string | null;
  message: string | null;
  expires_at: Date;
  consumes_at: Date | null;
  tier: {
    id: string;
    name: string;
    description: string | null;
    benefits: string[];
  };
}

export interface GiftContinuation {
  tierId: string;
  cadence: GiftCadence;
  trialDays: number | null;
}

export interface GiftMemberPresentation {
  cadence: GiftCadence;
  currency: string;
  amount: number;
}

export interface GiftPreview {
  cadence: GiftCadence;
  duration: number;
  tier: {
    id: string;
    name: string;
  };
}

export class GiftService {
  private readonly deps: GiftServiceDeps;

  constructor(deps: GiftServiceDeps) {
    this.deps = deps;
  }

  async startCheckout(input: StartGiftCheckoutInput): Promise<{ url: string }> {
    const customizationEnabled = this.deps.labsService.isSet('giftSubCustomization');
    const populatedDeliveryFields = [
      input.recipientEmail,
      input.recipientName,
      input.buyerName,
      input.personalMessage,
    ].some((value) => value !== undefined && value !== null && value !== '');

    if (!customizationEnabled && (input.deliveryMethod === 'email' || populatedDeliveryFields)) {
      throw new errors.BadRequestError({
        message: 'Bad Request.',
        context: 'Gift email delivery is not available',
      });
    }

    const parsedBuyerEmail = CheckoutBuyerEmailSchema.safeParse(input.buyer.email);
    if (customizationEnabled && !parsedBuyerEmail.success) {
      throw new errors.BadRequestError({
        message: 'Bad Request.',
        context: `Invalid gift buyer email: ${parsedBuyerEmail.error.issues[0].message}`,
      });
    }
    const buyerEmail = parsedBuyerEmail.success ? parsedBuyerEmail.data : input.buyer.email;

    const parsedDelivery = GiftCheckoutDeliverySchema.safeParse(
      customizationEnabled
        ? {
            deliveryMethod: input.deliveryMethod ?? 'link',
            recipientEmail: input.recipientEmail,
            recipientName: input.recipientName,
            buyerName: input.buyerName,
            personalMessage: input.personalMessage,
          }
        : {
            deliveryMethod: 'link',
          },
    );

    if (!parsedDelivery.success) {
      const issue = parsedDelivery.error.issues[0];
      throw new errors.BadRequestError({
        message: 'Bad Request.',
        context: `Invalid gift delivery data: ${issue.message}`,
      });
    }

    const delivery: GiftCheckoutDelivery = parsedDelivery.data;

    if (input.offerId) {
      throw new errors.BadRequestError({
        message: 'Bad Request.',
        context: 'Offers cannot be applied to gift subscriptions',
      });
    }

    if (!input.tierId) {
      throw new errors.BadRequestError({
        message: 'Bad Request.',
        context: 'Expected offerId or tierId, received none',
      });
    }

    let resolvedDuration: ResolvedGiftDuration | null = null;
    let cadence: GiftCadence;

    if (customizationEnabled) {
      resolvedDuration = resolveGiftDuration(input);
      cadence = resolvedDuration.cadence;
    } else {
      if (input.cadence !== 'month' && input.cadence !== 'year') {
        const receivedCadence = input.cadence ? `"${input.cadence}"` : input.cadence;

        throw new errors.BadRequestError({
          message: 'Bad Request.',
          context: `Expected cadence to be "month" or "year", received ${receivedCadence}`,
        });
      }

      cadence = input.cadence;
    }

    let tier: Tier | null;
    try {
      tier = await this.deps.tiersService.api.read(input.tierId);
    } catch (err) {
      logging.error(err);
      tier = null;
    }

    if (!tier) {
      throw new errors.BadRequestError({
        message: 'This tier does not exist.',
        context: `Tier with id "${input.tierId}" not found`,
      });
    }

    if (tier.status === 'archived') {
      throw new errors.NoPermissionError({
        message: 'This tier is archived.',
      });
    }

    let duration = 1;
    let totalMonths: number | undefined;
    let amount = tier.getPrice(cadence);

    if (resolvedDuration) {
      const plan = validateGiftCheckoutOffer({
        tier,
        portalPlans: this.deps.settingsCache.get('portal_plans'),
        offer: resolvedDuration,
      });

      cadence = plan.cadence;
      duration = plan.duration;
      totalMonths = plan.totalMonths;
      amount = plan.amount;
    }

    const tierId = typeof tier.id === 'string' ? tier.id : tier.id.toHexString();
    const token = this.generateToken();
    const successUrl = new URL(input.successUrl);

    successUrl.searchParams.set('stripe', 'gift-purchase-success');
    successUrl.searchParams.set('gift_token', token);
    successUrl.searchParams.set('gift_tier', tierId);
    successUrl.searchParams.set('gift_cadence', cadence);
    successUrl.searchParams.set('gift_delivery', delivery.deliveryMethod);
    if (totalMonths !== undefined) {
      successUrl.searchParams.set('gift_duration', String(totalMonths));
    }

    const buyer = { ...input.buyer, email: buyerEmail };
    const customerId = buyer.isAuthenticated
      ? await this.deps.checkoutAdapter.getCustomerId(buyer)
      : null;
    const gift = Gift.fromCheckout({
      token,
      buyerEmail,
      buyerMemberId: buyer.isAuthenticated ? buyer.memberId : null,
      buyerName: delivery.buyerName,
      recipientName: delivery.recipientName,
      personalMessage: delivery.personalMessage,
      tierId,
      cadence,
      duration,
      currency: tier.currency.toLowerCase(),
      amount,
    });
    const giftId = await this.deps.giftRepository.transaction(async (transacting) => {
      const id = await this.deps.giftRepository.create(gift, { transacting });
      if (delivery.deliveryMethod === 'email') {
        await this.deps.giftDeliveryService.createForCheckout(
          {
            giftId: id,
            recipientEmail: delivery.recipientEmail,
          },
          { transacting },
        );
      }
      return id;
    });

    let session: { id: string; url: string };
    try {
      session = await this.deps.checkoutAdapter.createSession({
        amount,
        currency: tier.currency.toLowerCase(),
        tierName: tier.name,
        cadence,
        duration,
        metadata: { ghost_gift_id: giftId },
        successUrl: successUrl.toString(),
        cancelUrl: input.cancelUrl,
        customerId,
        customerEmail: customerId ? null : buyerEmail,
        idempotencyKey: giftId,
      });
    } catch (err) {
      try {
        await this.deps.giftRepository.deletePendingCheckout(giftId);
      } catch (cleanupError) {
        logging.error(
          cleanupError,
          `Failed to clean up gift checkout ${giftId} after Stripe session creation failed`,
        );
      }
      throw err;
    }

    const bound = gift.bindCheckoutSession(session.id);
    if (!bound) {
      throw new errors.InternalServerError({
        message: `Failed to bind checkout session to gift: ${giftId}`,
      });
    }
    await this.deps.giftRepository.update(bound);

    return { url: session.url };
  }

  private generateToken(): string {
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

  async completePurchase(input: GiftPurchaseData | GiftPaymentCompletionData): Promise<boolean> {
    if ('giftId' in input) {
      return this.completePendingPurchase(input);
    }

    return this.completeLegacyPurchase(input);
  }

  private getClaimDeadline(purchasedAt: Date): Date {
    const timezoneSetting = this.deps.settingsCache.get('timezone');
    const zone =
      typeof timezoneSetting === 'string' && timezoneSetting ? timezoneSetting : DEFAULT_TIMEZONE;
    let purchase = DateTime.fromJSDate(purchasedAt, { zone });

    // A zone name the bundled tz data doesn't know would otherwise resolve
    // to the host's zone and date the deadline against the wrong calendar.
    if (!purchase.isValid) {
      logging.warn(
        `Unknown publication timezone "${zone}", dating the gift claim deadline in ${DEFAULT_TIMEZONE}`,
      );
      purchase = DateTime.fromJSDate(purchasedAt, { zone: DEFAULT_TIMEZONE });
    }

    return purchase.plus({ days: GIFT_EXPIRY_DAYS }).endOf('day').toJSDate();
  }

  private async completePendingPurchase(input: GiftPaymentCompletionData): Promise<boolean> {
    const parsed = GiftPaymentCompletionSchema.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new errors.ValidationError({
        message: 'Invalid gift purchase data.',
        property: issue.path.join('.'),
        context: issue.message,
      });
    }
    const data = parsed.data;
    const purchasedAt = new Date();
    const expiresAt = this.getClaimDeadline(purchasedAt);
    const member = data.stripeCustomerId
      ? await this.deps.memberRepository.get({ customer_id: data.stripeCustomerId })
      : null;

    const completed = await this.deps.giftRepository.transaction(async (transacting) => {
      const gift = await this.deps.giftRepository.getById(data.giftId, {
        transacting,
        forUpdate: true,
      });
      if (!gift) {
        logging.error(
          {
            event: { name: 'gift_purchase.completion_gift_missing' },
            giftId: data.giftId,
            stripeCheckoutSessionId: data.stripeCheckoutSessionId,
            stripePaymentIntentId: data.stripePaymentIntentId,
          },
          'Paid checkout completion has no matching gift',
        );
        return null;
      }
      if (gift.status !== 'payment_pending') {
        return null;
      }
      if (
        gift.stripeCheckoutSessionId &&
        gift.stripeCheckoutSessionId !== data.stripeCheckoutSessionId
      ) {
        throw new errors.ValidationError({ message: 'Checkout session does not match gift.' });
      }
      const buyerEmail = gift.buyerEmail ?? data.buyerEmail ?? member?.get('email') ?? null;
      if (!buyerEmail) {
        throw new errors.ValidationError({
          message: 'Invalid gift purchase data.',
          property: 'buyerEmail',
          context: 'A purchased gift requires a buyer email',
        });
      }
      // The pre-created gift owns the checkout price. Stripe's total may
      // include automatic tax, so completion only adds settlement facts.
      const purchased = gift.completePurchase({
        buyerEmail,
        buyerMemberId: member?.id ?? gift.buyerMemberId,
        stripeCheckoutSessionId: data.stripeCheckoutSessionId,
        stripePaymentIntentId: data.stripePaymentIntentId,
        purchasedAt,
        expiresAt,
      });
      if (!purchased) {
        return null;
      }

      await this.deps.giftRepository.update(purchased, { transacting });
      return purchased;
    });

    if (!completed) {
      return false;
    }

    let recipientEmail: string | null = null;
    try {
      recipientEmail = await this.deps.giftDeliveryService.dispatchForGift(data.giftId);
    } catch (err) {
      logging.error(
        {
          event: { name: 'gift_delivery.dispatch_failed' },
          err,
          giftId: data.giftId,
        },
        'Failed to dispatch purchased gift delivery',
      );
    }
    await this.sendPurchaseNotifications(completed, member, recipientEmail);
    return true;
  }

  private async completeLegacyPurchase(input: GiftPurchaseData): Promise<boolean> {
    const parsed = GiftPurchaseDataSchema.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new errors.ValidationError({
        message: 'Invalid gift purchase data.',
        property: issue.path.join('.'),
        context: issue.message,
      });
    }
    const data = parsed.data;
    const purchasedAt = new Date();
    const expiresAt = this.getClaimDeadline(purchasedAt);

    if (await this.deps.giftRepository.existsByCheckoutSessionId(data.stripeCheckoutSessionId)) {
      return false;
    }

    const member = data.stripeCustomerId
      ? await this.deps.memberRepository.get({ customer_id: data.stripeCustomerId })
      : null;

    const gift = Gift.fromPurchase({
      token: data.token,
      buyerEmail: data.buyerEmail,
      buyerMemberId: member?.id ?? null,
      tierId: data.tierId,
      cadence: data.cadence,
      duration: data.duration,
      currency: data.currency,
      amount: data.amount,
      stripeCheckoutSessionId: data.stripeCheckoutSessionId,
      stripePaymentIntentId: data.stripePaymentIntentId,
      purchasedAt,
      expiresAt,
    });

    await this.deps.giftRepository.create(gift);
    await this.sendPurchaseNotifications(gift, member, null);
    return true;
  }

  private async sendPurchaseNotifications(
    gift: Gift,
    member: MemberModel | null,
    recipientEmail: string | null,
  ): Promise<void> {
    let tier: Tier | null;
    try {
      tier = await this.deps.tiersService.api.read(gift.tierId);
    } catch (err) {
      logging.error(
        {
          event: { name: 'gift_purchase_notifications.tier_read_failed' },
          err,
          tierId: gift.tierId,
        },
        'Failed to read tier for gift purchase notifications',
      );
      return;
    }

    if (!tier) {
      logging.error(
        {
          event: { name: 'gift_purchase_notifications.tier_missing' },
          tierId: gift.tierId,
        },
        'Tier not found for gift purchase notifications',
      );
      return;
    }

    const buyerEmail = gift.buyerEmail ?? member?.get('email') ?? null;
    if (!buyerEmail) {
      logging.warn('Skipping purchase notifications because the buyer email is unavailable');
      return;
    }

    try {
      await this.deps.staffServiceEmails.notifyGiftPurchased({
        name: member?.get('name') ?? null,
        email: member?.get('email') ?? buyerEmail,
        memberId: member?.id ?? null,
        amount: gift.amount,
        currency: gift.currency,
        tierName: tier.name,
        cadence: gift.cadence,
        duration: gift.duration,
      });
    } catch (err) {
      logging.error('Failed to notify staff of gift purchase', err);
    }

    try {
      await this.deps.giftEmailService.sendPurchaseConfirmation({
        buyerEmail,
        token: gift.token,
        tierName: tier.name,
        cadence: gift.cadence,
        duration: gift.duration,
        expiresAt: gift.expiresAt!,
        recipientEmail,
      });
    } catch (err) {
      logging.error('Failed to send gift purchase confirmation email', err);
    }
  }

  private assertRedeemable(gift: Gift, memberStatus: string | null): Gift {
    const redeemableCheck = gift.checkRedeemable(memberStatus);

    if (!redeemableCheck.redeemable) {
      switch (redeemableCheck.reason) {
        case 'payment-pending':
          throw new errors.NotFoundError({
            message: tpl(errorMessages.giftNotFound),
            code: 'GIFT_NOT_FOUND',
          });
        case 'redeemed':
          throw new errors.BadRequestError({
            message: tpl(errorMessages.giftAlreadyRedeemed),
            code: 'GIFT_REDEEMED',
          });
        case 'consumed':
          throw new errors.BadRequestError({
            message: tpl(errorMessages.giftConsumed),
            code: 'GIFT_CONSUMED',
          });
        case 'expired':
          throw new errors.BadRequestError({
            message: tpl(errorMessages.giftExpired),
            code: 'GIFT_EXPIRED',
          });
        case 'refunded':
          throw new errors.BadRequestError({
            message: tpl(errorMessages.giftRefunded),
            code: 'GIFT_REFUNDED',
          });
        case 'paid-member':
          throw new errors.BadRequestError({
            message: tpl(errorMessages.paidMember),
            code: 'GIFT_PAID_MEMBER',
          });
        default: {
          const exhaustiveCheck: never = redeemableCheck.reason;

          throw new errors.InternalServerError({
            message: `Unhandled redeem failure reason: ${exhaustiveCheck}`,
          });
        }
      }
    }

    return gift;
  }

  async getRedeemable(input: {
    token: string;
    memberStatus: string | null;
  }): Promise<GiftRedemption> {
    const gift = await this.deps.giftRepository.getByToken(input.token);

    if (!gift) {
      throw new errors.NotFoundError({
        message: tpl(errorMessages.giftNotFound),
        code: 'GIFT_NOT_FOUND',
      });
    }

    this.assertRedeemable(gift, input.memberStatus);

    return this.serializeRedemption(gift);
  }

  async redeem(input: {
    token: string;
    memberId: string;
    transacting?: Knex.Transaction;
    newMember?: boolean;
  }): Promise<GiftRedemption> {
    const run = async (transacting: Knex.Transaction) => {
      const { redeemed, member } = await this.redeemGift(input.token, input.memberId, {
        transacting,
        newMember: input.newMember,
      });
      const redemption = await this.serializeRedemption(redeemed);

      return { redeemed, member, redemption };
    };

    const { redeemed, member, redemption } = input.transacting
      ? await run(input.transacting)
      : await this.deps.giftRepository.transaction(run);

    const notify = async () => {
      try {
        const tier = await this.deps.tiersService.api.read(redeemed.tierId);

        if (!tier) {
          throw new errors.NotFoundError({ message: `Tier not found: ${redeemed.tierId}` });
        }

        await this.deps.staffServiceEmails.notifyGiftSubscriptionStarted({
          memberId: member.id,
          memberEmail: member.get('email'),
          memberName: member.get('name'),
          tierName: tier.name,
          cadence: redeemed.cadence,
          duration: redeemed.duration,
          buyerEmail: redeemed.buyerEmail!,
        });
      } catch (err) {
        logging.error('Failed to notify staff of gift redemption', err);
      }

      await this.deps.giftReminderScheduler.scheduleFor(redeemed);
    };

    if (input.transacting) {
      // Only notify once the transaction has finished
      input.transacting.executionPromise.then(notify, () => {});
    } else {
      await notify();
    }

    return redemption;
  }

  private async redeemGift(
    token: string,
    memberId: string,
    options: { transacting: Knex.Transaction; newMember?: boolean },
  ): Promise<{ redeemed: Gift; member: MemberModel }> {
    const { transacting } = options;
    const member = await this.deps.memberRepository.get(
      { id: memberId },
      { transacting, forUpdate: true },
    );
    if (!member) {
      throw new errors.NotFoundError({ message: `Member not found: ${memberId}` });
    }

    const gift = await this.deps.giftRepository.getByToken(token, { transacting, forUpdate: true });
    if (!gift) {
      throw new errors.NotFoundError({
        message: tpl(errorMessages.giftNotFound),
        code: 'GIFT_NOT_FOUND',
      });
    }

    if (options.newMember) {
      this.assertRedeemable(gift, null);
    } else {
      this.assertRedeemable(gift, member.get('status'));
    }

    const redeemed = gift.redeem({ memberId });

    await this.deps.memberRepository.update(
      {
        products: [
          {
            id: redeemed.tierId,
            expiry_at: redeemed.consumesAt,
          },
        ],
        status: 'gift',
      },
      { id: memberId, transacting },
    );

    await this.deps.giftRepository.update(redeemed, { transacting });
    await this.deps.giftDeliveryService.cancelPendingForGift(redeemed.token, { transacting });

    // Gift members receive the paid welcome email, as they receive access to paid content
    await this.deps.memberRepository.triggerMemberSignupAutomation(
      memberId,
      member.get('email'),
      'paid',
      { transacting },
    );

    return { redeemed, member };
  }

  private async getActiveByMember(
    memberId: string,
    options: { transacting?: Knex.Transaction } = {},
  ): Promise<Gift | null> {
    if (!memberId) {
      return null;
    }
    return this.deps.giftRepository.getActiveByMember(memberId, options);
  }

  private async getActiveByMembers(
    memberIds: string[],
    options: { transacting?: Knex.Transaction } = {},
  ): Promise<Map<string, Gift>> {
    if (!memberIds || memberIds.length === 0) {
      return new Map();
    }
    return this.deps.giftRepository.getActiveByMembers(memberIds, options);
  }

  private getRemainingActiveDays(gift: Gift, now: Date = new Date()): number {
    if (!gift.isRedeemed() || !gift.consumesAt || gift.isConsumed()) {
      return 0;
    }

    const diffDays = Math.ceil((gift.consumesAt.getTime() - now.getTime()) / MS_PER_DAY);

    return Math.max(0, diffDays);
  }

  async preparePaidContinuation({
    memberId,
    memberStatus,
  }: {
    memberId: string;
    memberStatus: string;
  }): Promise<GiftContinuation> {
    if (memberStatus !== 'gift') {
      throw new errors.BadRequestError({
        message: 'Bad Request.',
        context: 'Member does not have an active gift subscription',
      });
    }

    const gift = await this.getActiveByMember(memberId);

    if (!gift) {
      throw new errors.BadRequestError({
        message: 'Bad Request.',
        context: 'No active gift subscription found for member',
      });
    }

    const remainingDays = this.getRemainingActiveDays(gift);

    return {
      tierId: gift.tierId,
      cadence: gift.cadence,
      trialDays: remainingDays > 0 ? Math.min(remainingDays, 730) : null,
    };
  }

  async getMemberPresentations(memberIds: string[]): Promise<Map<string, GiftMemberPresentation>> {
    const gifts = await this.getActiveByMembers(memberIds);
    const presentations = new Map<string, GiftMemberPresentation>();

    for (const [memberId, gift] of gifts) {
      presentations.set(memberId, {
        cadence: gift.cadence,
        currency: gift.currency,
        amount: gift.amount,
      });
    }

    return presentations;
  }

  async getPreview(token: string): Promise<GiftPreview | null> {
    const gift = await this.deps.giftRepository.getByToken(token);

    if (!gift || gift.status === 'payment_pending') {
      return null;
    }

    const tier = await this.deps.tiersService.api.read(gift.tierId);

    if (!tier) {
      throw new errors.NotFoundError({ message: `Tier not found for gift: ${gift.token}` });
    }

    const tierJSON = tier.toJSON();

    return {
      cadence: gift.cadence,
      duration: gift.duration,
      tier: {
        id: tierJSON.id,
        name: tierJSON.name,
      },
    };
  }

  browsePurchaseEvents(options?: GiftEventBrowseOptions, filter?: unknown): Promise<GiftEventPage> {
    return this.deps.giftRepository.browsePurchaseEvents(options, filter);
  }

  browseRedemptionEvents(
    options?: GiftEventBrowseOptions,
    filter?: unknown,
  ): Promise<GiftEventPage> {
    return this.deps.giftRepository.browseRedemptionEvents(options, filter);
  }

  async reassignRedeemer(input: {
    giftId: string;
    memberId: string;
    transacting?: Knex.Transaction;
  }): Promise<void> {
    const { giftId, memberId } = input;
    const run = async (transacting: Knex.Transaction): Promise<Gift> => {
      const gift = await this.deps.giftRepository.getById(giftId, { transacting, forUpdate: true });

      if (!gift) {
        throw new errors.NotFoundError({ message: tpl(errorMessages.giftNotFound) });
      }

      if (gift.redeemerMemberId === memberId) {
        return gift;
      }

      const check = gift.checkReassignable();

      if (!check.reassignable) {
        switch (check.reason) {
          case 'assigned':
            throw new errors.BadRequestError({ message: tpl(errorMessages.giftAlreadyAssigned) });
          case 'unredeemed':
          case 'consumed':
          case 'expired':
          case 'refunded':
            throw new errors.BadRequestError({
              message: tpl(errorMessages.giftInvalidReassignStatus),
            });
          case 'missing-consumes-at':
            throw new errors.BadRequestError({ message: tpl(errorMessages.giftMissingConsumesAt) });
          default: {
            const exhaustiveCheck: never = check.reason;

            throw new errors.InternalServerError({
              message: `Unhandled reassign failure reason: ${exhaustiveCheck}`,
            });
          }
        }
      }

      const member = await this.deps.memberRepository.get(
        { id: memberId },
        { transacting, forUpdate: true },
      );

      if (!member) {
        throw new errors.NotFoundError({ message: `Member not found: ${memberId}` });
      }

      const memberStatus = member.get('status');
      if (memberStatus !== 'free' && memberStatus !== 'gift') {
        throw new errors.BadRequestError({ message: tpl(errorMessages.giftInvalidReassignMember) });
      }

      const existingActiveGift = await this.deps.giftRepository.getActiveByMember(memberId, {
        transacting,
      });
      if (existingActiveGift && existingActiveGift.token !== gift.token) {
        throw new errors.BadRequestError({ message: tpl(errorMessages.giftMemberAlreadyHasGift) });
      }

      const reassignedGift = gift.reassignRedeemer(memberId);

      await this.deps.memberRepository.update(
        {
          products: [
            {
              id: reassignedGift.tierId,
              expiry_at: reassignedGift.consumesAt,
            },
          ],
          status: 'gift',
        },
        { id: memberId, transacting },
      );

      await this.deps.giftRepository.update(reassignedGift, { transacting });

      return reassignedGift;
    };

    await (input.transacting ? run(input.transacting) : this.deps.giftRepository.transaction(run));
  }

  async handlePaymentRefund({ paymentIntentId }: { paymentIntentId: string }): Promise<boolean> {
    const gift = await this.deps.giftRepository.getByPaymentIntentId(paymentIntentId);

    if (!gift) {
      return false;
    }

    const refunded = gift.refund();

    if (!refunded) {
      return true;
    }

    await this.deps.giftRepository.transaction(async (transacting) => {
      await this.deps.giftRepository.update(refunded, { transacting });
      await this.deps.giftDeliveryService.cancelPendingForGift(refunded.token, { transacting });

      if (gift.redeemerMemberId) {
        const member = await this.deps.memberRepository.get(
          { id: gift.redeemerMemberId },
          { transacting },
        );

        if (member?.get('status') === 'gift') {
          await this.deps.memberRepository.update(
            {
              products: [],
              status: 'free',
            },
            { id: gift.redeemerMemberId, transacting },
          );
        }
      }
    });

    return true;
  }

  async handlePaidSubscriptionActivation(memberId: string): Promise<boolean> {
    const gift = await this.getActiveByMember(memberId);

    if (!gift) {
      return false;
    }

    return Boolean(await this.consume(gift.token));
  }

  private async consume(
    token: string,
    options: { transacting?: Knex.Transaction } = {},
  ): Promise<Gift | null> {
    const run = async (transacting: Knex.Transaction) => {
      // Fetch with a row lock to prevent race conditions under concurrency
      const gift = await this.deps.giftRepository.getByToken(token, {
        transacting,
        forUpdate: true,
      });

      if (!gift || gift.status !== 'redeemed') {
        return null;
      }

      const consumed = gift.consume();

      if (!consumed) {
        return null;
      }

      await this.deps.giftRepository.update(consumed, { transacting });

      return consumed;
    };

    return options.transacting
      ? await run(options.transacting)
      : await this.deps.giftRepository.transaction(run);
  }

  async processConsumed(): Promise<{ consumedCount: number; updatedMemberCount: number }> {
    const toConsume = await this.deps.giftRepository.findPendingConsumption();

    if (toConsume.length === 0) {
      return { consumedCount: 0, updatedMemberCount: 0 };
    }

    let consumedCount = 0;
    let updatedMemberCount = 0;

    for (const gift of toConsume) {
      await this.deps.giftRepository.transaction(async (transacting) => {
        const consumed = await this.consume(gift.token, { transacting });

        if (!consumed) {
          return;
        }

        const member = await this.deps.memberRepository.get(
          { id: consumed.redeemerMemberId },
          { transacting, forUpdate: true },
        );

        if (member && member.get('status') === 'gift') {
          await this.deps.memberRepository.update(
            {
              products: [],
              status: 'free',
            },
            { id: consumed.redeemerMemberId, transacting },
          );

          updatedMemberCount += 1;
        }

        consumedCount += 1;
      });
    }

    return { consumedCount, updatedMemberCount };
  }

  async processExpired(): Promise<{ expiredCount: number }> {
    const toExpire = await this.deps.giftRepository.findPendingExpiration();

    if (toExpire.length === 0) {
      return { expiredCount: 0 };
    }

    let expiredCount = 0;

    for (const gift of toExpire) {
      await this.deps.giftRepository.transaction(async (transacting) => {
        // Re-fetch with a row lock to prevent races with concurrent redeems / refunds
        const locked = await this.deps.giftRepository.getByToken(gift.token, {
          transacting,
          forUpdate: true,
        });

        if (locked?.status !== 'purchased') {
          return;
        }

        const expired = locked.expire();

        if (!expired) {
          return;
        }

        await this.deps.giftRepository.update(expired, { transacting });
        await this.deps.giftDeliveryService.cancelPendingForGift(expired.token, { transacting });

        expiredCount += 1;
      });
    }

    return { expiredCount };
  }

  async processAbandonedCheckouts(): Promise<{ deletedCount: number }> {
    const cutoff = new Date(Date.now() - GIFT_CHECKOUT_RETENTION_DAYS * MS_PER_DAY);
    const deletedCount = await this.deps.giftRepository.deleteAbandonedCheckouts(cutoff);

    return { deletedCount };
  }

  async processReminders(): Promise<{
    remindedCount: number;
    skippedCount: number;
    failedCount: number;
  }> {
    const now = new Date();
    const toRemind = await this.deps.giftRepository.findPendingReminder({
      now,
      reminderLeadMs: GIFT_REMINDER_LEAD_MS,
      reminderFloorMs: GIFT_REMINDER_FLOOR_MS,
    });

    if (toRemind.length === 0) {
      return { remindedCount: 0, skippedCount: 0, failedCount: 0 };
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

    return { remindedCount, skippedCount, failedCount };
  }

  private async sendReminderForGift(token: string): Promise<boolean> {
    const gift = await this.deps.giftRepository.getByToken(token);

    if (!gift) {
      return false;
    }

    const tier = await this.deps.tiersService.api.read(gift.tierId);

    if (!tier) {
      throw new errors.NotFoundError({ message: `Tier not found for gift: ${gift.tierId}` });
    }

    const result = await this.deps.giftRepository.transaction(
      async (transacting): Promise<ReminderSend | null> => {
        const locked = await this.deps.giftRepository.getByToken(token, {
          transacting,
          forUpdate: true,
        });

        if (!locked) {
          return null;
        }

        if (
          // Gift must still be active — a concurrent refund or early consume can happen
          // between `findPendingReminder` and this re-read.
          locked.status !== 'redeemed' ||
          // Idempotency guard: another path (rerun, scheduler) may already have sent.
          locked.consumesSoonReminderSentAt !== null ||
          // Narrows `redeemerMemberId` from `string | null` to `string` — always set for redeemed gifts.
          locked.redeemerMemberId === null ||
          // Narrows `consumesAt` from `Date | null` to `Date` — always set for redeemed gifts.
          locked.consumesAt === null
        ) {
          return null;
        }

        const member = await this.deps.memberRepository.get(
          { id: locked.redeemerMemberId },
          { transacting, forUpdate: true },
        );

        // Record the reminder as sent before any skip or send below so we don't
        // re-try gifts with permanently unreachable redeemers on every poll.
        const reminded = locked.remind();

        if (!reminded) {
          return null;
        }

        await this.deps.giftRepository.update(reminded, { transacting });

        if (!member) {
          return null;
        }

        if (member.get('email_disabled')) {
          return null;
        }

        return {
          memberEmail: member.get('email'),
          memberName: member.get('name'),
          consumesAt: locked.consumesAt,
        };
      },
    );

    if (!result) {
      return false;
    }

    await this.deps.giftEmailService.sendReminder({
      memberEmail: result.memberEmail,
      memberName: result.memberName,
      tierName: tier.name,
      consumesAt: result.consumesAt,
    });

    return true;
  }

  private async serializeRedemption(gift: Gift): Promise<GiftRedemption> {
    const tier = await this.deps.tiersService.api.read(gift.tierId);

    if (!tier) {
      throw new errors.InternalServerError({
        message: `Tier ${gift.tierId} not found for gift: ${gift.token}`,
      });
    }

    const tierJSON = tier.toJSON();

    return {
      token: gift.token,
      cadence: gift.cadence,
      duration: gift.duration,
      currency: gift.currency,
      amount: gift.amount,
      buyer_name: gift.buyerName,
      recipient_name: gift.recipientName,
      message: gift.personalMessage,
      expires_at: gift.expiresAt!,
      consumes_at: gift.consumesAt,
      tier: {
        id: tierJSON.id,
        name: tierJSON.name,
        description: tierJSON.description,
        benefits: tierJSON.benefits,
      },
    };
  }
}
