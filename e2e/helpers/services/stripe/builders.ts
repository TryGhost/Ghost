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

export type StripeProduct = Pick<Stripe.Product, 'active' | 'id' | 'name' | 'object'>;

export type StripePrice = Omit<Pick<Stripe.Price, 'active' | 'currency' | 'id' | 'nickname' | 'object' | 'product' | 'recurring' | 'type' | 'unit_amount'>, 'product' | 'recurring'> & {
    custom_unit_amount: StripeCustomUnitAmount | null;
    product: string;
    recurring: {interval: StripePriceInterval} | null;
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

export type StripeSubscription = Omit<Pick<Stripe.Subscription, 'cancel_at_period_end' | 'canceled_at' | 'current_period_end' | 'customer' | 'default_payment_method' | 'id' | 'items' | 'metadata' | 'object' | 'start_date' | 'status' | 'trial_end' | 'trial_start'>, 'customer' | 'default_payment_method' | 'items' | 'metadata'> & {
    customer: string;
    default_payment_method: string | null;
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
    itemId?: string;
    paymentMethod?: StripePaymentMethod | null;
    price?: StripePrice;
    priceId?: string;
    productId?: string;
    status?: Stripe.Subscription.Status;
}): StripeSubscription {
    const price = opts.price ?? buildPrice({
        id: opts.priceId,
        product: opts.productId ?? generateId('prod')
    });

    return {
        id: opts.id ?? generateId('sub'),
        object: 'subscription',
        status: opts.status ?? 'active',
        cancel_at_period_end: false,
        canceled_at: null,
        current_period_end: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 31),
        start_date: Math.floor(Date.now() / 1000),
        trial_start: null,
        trial_end: null,
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
