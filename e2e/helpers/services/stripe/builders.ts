import crypto from 'crypto';
import type Stripe from 'stripe';

// Keep fake Stripe HTTP responses close to Stripe's published shapes so Ghost interacts
// with realistic field names, enums, and nullability at the API boundary. Internal fake
// request/recorded state stays local and minimal because it exists only to support tests,
// not to model Stripe end to end.

function generateId(prefix: string): string {
    return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

type StripeList<T> = Pick<Stripe.ApiList<T>, 'data' | 'object'>;
type StripePriceInterval = NonNullable<Stripe.Price['recurring']>['interval'];
type StripeCustomUnitAmount = {
    enabled: boolean;
    preset: number | null;
};

function addMonthsToTimestamp(start: number, months: number): number {
    const date = new Date(start * 1000);
    date.setUTCMonth(date.getUTCMonth() + months);
    return Math.floor(date.getTime() / 1000);
}

export type StripeProduct = Pick<Stripe.Product, 'active' | 'id' | 'name' | 'object'>;

export type StripePrice = Omit<Pick<Stripe.Price, 'active' | 'currency' | 'id' | 'nickname' | 'object' | 'product' | 'recurring' | 'type' | 'unit_amount'>, 'product' | 'recurring'> & {
    custom_unit_amount: StripeCustomUnitAmount | null;
    product: string;
    recurring: {interval: StripePriceInterval} | null;
};

export type StripeCoupon = Omit<Pick<Stripe.Coupon, 'amount_off' | 'currency' | 'duration' | 'duration_in_months' | 'id' | 'name' | 'object' | 'percent_off'>, 'amount_off' | 'currency' | 'duration_in_months' | 'name' | 'percent_off'> & {
    amount_off: number | null;
    currency: string | null;
    duration_in_months: number | null;
    name: string | null;
    percent_off: number | null;
};

export type StripeDiscount = Omit<Pick<Stripe.Discount, 'coupon' | 'end' | 'id' | 'object' | 'start'>, 'coupon' | 'end'> & {
    coupon: StripeCoupon;
    end: number | null;
};

export type StripePaymentMethod = Omit<Pick<Stripe.PaymentMethod, 'billing_details' | 'card' | 'id' | 'object' | 'type'>, 'billing_details' | 'card' | 'type'> & {
    billing_details: {name: string};
    card: Pick<NonNullable<Stripe.PaymentMethod.Card>, 'brand' | 'country' | 'exp_month' | 'exp_year' | 'last4'>;
    type: 'card';
};

type StripeSubscriptionItem = Omit<Pick<Stripe.SubscriptionItem, 'price'>, 'price'> & {
    id: string;
    object: 'subscription_item';
    price: StripePrice;
};

export type StripeSubscription = Omit<Pick<Stripe.Subscription, 'cancel_at_period_end' | 'canceled_at' | 'current_period_end' | 'customer' | 'default_payment_method' | 'discount' | 'id' | 'items' | 'metadata' | 'object' | 'start_date' | 'status' | 'trial_end' | 'trial_start'>, 'customer' | 'default_payment_method' | 'discount' | 'items' | 'metadata'> & {
    customer: string;
    default_payment_method: string | null;
    discount: StripeDiscount | null;
    items: StripeList<StripeSubscriptionItem>;
    metadata: Stripe.Metadata;
};

export type StripeCustomer = Omit<Pick<Stripe.Customer, 'email' | 'id' | 'name' | 'object'>, 'email' | 'name'> & {
    email: string;
    name: string;
    subscriptions: StripeList<StripeSubscription>;
};

export type StripeEvent = Pick<Stripe.Event, 'id' | 'object' | 'type'> & {
    data: {
        object: Record<string, unknown>;
        previous_attributes?: Record<string, unknown>;
    };
};

export type StripeCheckoutSessionResponse = Omit<Pick<Stripe.Checkout.Session, 'cancel_url' | 'customer' | 'customer_email' | 'id' | 'metadata' | 'mode' | 'object' | 'success_url' | 'url'>, 'customer' | 'customer_email' | 'metadata' | 'url'> & {
    customer: string | null;
    customer_email: string | null;
    metadata: Stripe.Metadata;
    url: string;
};

export interface StripeCheckoutSessionRequest {
    discounts?: Array<{coupon: string}>;
    line_items?: Array<{price: string; quantity: number}>;
    subscription_data?: {
        items: Array<{plan: string}>;
        metadata?: Record<string, unknown>;
        trial_from_plan?: boolean;
        trial_period_days?: number;
    };
    custom_fields?: Array<{
        key: string;
        label?: {custom: string};
        optional?: boolean;
        text?: {value: string};
        type: 'text';
    }>;
    invoice_creation?: {
        enabled: boolean;
        invoice_data?: {
            metadata: Record<string, string>;
        };
    };
    submit_type?: 'auto' | 'book' | 'donate' | 'pay' | 'send';
}

export interface RecordedStripeCheckoutSession {
    request: StripeCheckoutSessionRequest;
    response: StripeCheckoutSessionResponse;
}

interface CheckoutSessionOverrides {
    request?: Partial<StripeCheckoutSessionRequest>;
    response?: Partial<StripeCheckoutSessionResponse>;
}

export function buildProduct(overrides: Partial<StripeProduct> = {}): StripeProduct {
    return {
        id: generateId('prod'),
        object: 'product',
        active: true,
        name: 'Test Product',
        ...overrides
    };
}

export function buildPrice(overrides: Partial<StripePrice> = {}): StripePrice {
    return {
        id: generateId('price'),
        object: 'price',
        unit_amount: 500,
        currency: 'usd',
        custom_unit_amount: null,
        recurring: {interval: 'month'},
        product: generateId('prod'),
        type: 'recurring',
        active: true,
        nickname: null,
        ...overrides
    };
}

export function buildCoupon(overrides: Partial<StripeCoupon> = {}): StripeCoupon {
    return {
        id: generateId('coupon'),
        object: 'coupon',
        amount_off: null,
        currency: null,
        duration: 'once',
        duration_in_months: null,
        name: 'Test Coupon',
        percent_off: 10,
        ...overrides
    };
}

export function buildDiscount(opts: {
    coupon: StripeCoupon;
    start?: number;
}): StripeDiscount {
    const start = opts.start ?? Math.floor(Date.now() / 1000);
    let end: number | null = null;

    if (opts.coupon.duration === 'repeating' && typeof opts.coupon.duration_in_months === 'number' && opts.coupon.duration_in_months > 0) {
        end = addMonthsToTimestamp(start, opts.coupon.duration_in_months);
    }

    return {
        id: generateId('di'),
        object: 'discount',
        coupon: opts.coupon,
        start,
        end
    };
}

export function buildPaymentMethod(overrides: {id?: string; name?: string} = {}): StripePaymentMethod {
    return {
        id: overrides.id ?? generateId('pm'),
        object: 'payment_method',
        type: 'card',
        card: {
            brand: 'visa',
            last4: '4242',
            exp_month: 12,
            exp_year: 2030,
            country: 'US'
        },
        billing_details: {
            name: overrides.name ?? 'Test User'
        }
    };
}

export function buildCustomer(opts: {id?: string; email: string; name: string}): StripeCustomer {
    return {
        id: opts.id ?? generateId('cus'),
        object: 'customer',
        name: opts.name,
        email: opts.email,
        subscriptions: {
            object: 'list',
            data: []
        }
    };
}

export function buildSubscription(opts: {
    id?: string;
    customerId: string;
    discount?: StripeDiscount | null;
    itemId?: string;
    paymentMethod?: StripePaymentMethod | null;
    price?: StripePrice;
    priceId?: string;
    productId?: string;
    status?: Stripe.Subscription.Status;
    trialDays?: number;
}): StripeSubscription {
    const price = opts.price ?? buildPrice({
        id: opts.priceId,
        product: opts.productId ?? generateId('prod')
    });
    const startDate = Math.floor(Date.now() / 1000);
    const trialDays = typeof opts.trialDays === 'number' && opts.trialDays > 0 ? opts.trialDays : null;
    const status = opts.status ?? (trialDays ? 'trialing' : 'active');
    const trialEnd = trialDays ? startDate + (60 * 60 * 24 * trialDays) : null;
    const currentPeriodEnd = trialDays && status === 'trialing' && trialEnd
        ? trialEnd
        : startDate + (60 * 60 * 24 * 31);

    return {
        id: opts.id ?? generateId('sub'),
        object: 'subscription',
        status,
        cancel_at_period_end: false,
        canceled_at: null,
        current_period_end: currentPeriodEnd,
        start_date: startDate,
        trial_start: trialDays ? startDate : null,
        trial_end: trialEnd,
        discount: opts.discount ?? null,
        metadata: {},
        default_payment_method: opts.paymentMethod?.id ?? null,
        items: {
            object: 'list',
            data: [{
                id: opts.itemId ?? generateId('si'),
                object: 'subscription_item',
                price
            }]
        },
        customer: opts.customerId
    };
}

export function buildCheckoutSessionCompletedEvent(opts: {
    customerId: string;
    metadata?: Record<string, string>;
}): StripeEvent {
    return {
        id: generateId('evt'),
        object: 'event',
        type: 'checkout.session.completed',
        data: {
            object: {
                mode: 'subscription',
                customer: opts.customerId,
                metadata: {
                    checkoutType: 'signup',
                    ...(opts.metadata ?? {})
                }
            }
        }
    };
}

export function buildDonationCheckoutCompletedEvent(opts: {
    amount: number;
    currency: string;
    customerEmail: string;
    customerId?: string | null;
    donationMessage?: string | null;
    metadata?: Record<string, string>;
    name: string;
}): StripeEvent {
    return {
        id: generateId('evt'),
        object: 'event',
        type: 'checkout.session.completed',
        data: {
            object: {
                object: 'checkout.session',
                mode: 'payment',
                amount_total: opts.amount,
                currency: opts.currency,
                customer: opts.customerId ?? null,
                customer_details: {
                    email: opts.customerEmail,
                    name: opts.name
                },
                metadata: {
                    ...(opts.metadata ?? {}),
                    ghost_donation: 'true'
                },
                custom_fields: opts.donationMessage ? [{
                    key: 'donation_message',
                    text: {
                        value: opts.donationMessage
                    }
                }] : []
            }
        }
    };
}

export function buildSubscriptionCreatedEvent(opts: {
    subscription: StripeSubscription;
}): StripeEvent {
    return {
        id: generateId('evt'),
        object: 'event',
        type: 'customer.subscription.created',
        data: {
            object: opts.subscription as unknown as Record<string, unknown>
        }
    };
}

export function buildSubscriptionUpdatedEvent(opts: {
    previousAttributes?: Record<string, unknown>;
    subscription: StripeSubscription;
}): StripeEvent {
    return {
        id: generateId('evt'),
        object: 'event',
        type: 'customer.subscription.updated',
        data: {
            object: opts.subscription as unknown as Record<string, unknown>,
            previous_attributes: opts.previousAttributes ?? {}
        }
    };
}

export function buildSubscriptionDeletedEvent(opts: {
    subscription: StripeSubscription;
}): StripeEvent {
    return {
        id: generateId('evt'),
        object: 'event',
        type: 'customer.subscription.deleted',
        data: {
            object: {
                ...opts.subscription,
                status: 'canceled'
            } as unknown as Record<string, unknown>
        }
    };
}

export function buildInvoicePaymentSucceededEvent(opts: {
    amount?: number;
    subscription: StripeSubscription;
}): StripeEvent {
    const price = opts.subscription.items.data[0]?.price;
    return {
        id: generateId('evt'),
        object: 'event',
        type: 'invoice.payment_succeeded',
        data: {
            object: {
                id: generateId('in'),
                object: 'invoice',
                subscription: opts.subscription.id,
                customer: opts.subscription.customer,
                paid: true,
                amount_paid: opts.amount ?? price?.unit_amount ?? 0,
                currency: price?.currency ?? 'usd',
                lines: {
                    object: 'list',
                    data: [{
                        price: price as unknown as Record<string, unknown>
                    }]
                }
            }
        }
    };
}

export function buildCheckoutSession(overrides: CheckoutSessionOverrides = {}): RecordedStripeCheckoutSession {
    const id = overrides.response?.id ?? generateId('cs');

    return {
        request: {...(overrides.request ?? {})},
        response: {
            id,
            object: 'checkout.session',
            mode: 'subscription',
            url: `http://localhost/checkout/sessions/${id}`,
            customer: null,
            customer_email: null,
            success_url: 'http://localhost:2368/?stripe=success',
            cancel_url: 'http://localhost:2368/?stripe=cancel',
            metadata: {},
            ...(overrides.response ?? {})
        }
    };
}
