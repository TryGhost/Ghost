import crypto from 'crypto';

function generateId(prefix: string): string {
    return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

export interface StripeCustomer {
    id: string;
    object: 'customer';
    name: string;
    email: string;
    subscriptions: {
        type: 'list';
        data: StripeSubscription[];
    };
}

export interface StripePrice {
    id: string;
    object: 'price';
    unit_amount: number;
    currency: string;
    recurring: {
        interval: string;
    };
    product: string;
    type: 'recurring';
    active: boolean;
    nickname: string | null;
}

export interface StripePaymentMethod {
    id: string;
    object: 'payment_method';
    type: 'card';
    card: {
        brand: string;
        last4: string;
        exp_month: number;
        exp_year: number;
        country: string;
    };
    billing_details: {
        name: string;
    };
}

export interface StripeSubscription {
    id: string;
    object: 'subscription';
    status: string;
    cancel_at_period_end: boolean;
    canceled_at: number | null;
    current_period_end: number;
    start_date: number;
    default_payment_method: string | null;
    items: {
        type: 'list';
        data: Array<{price: StripePrice}>;
    };
    customer: string;
}

export interface StripeEvent {
    id: string;
    object: 'event';
    type: string;
    data: {
        object: Record<string, unknown>;
    };
}

export function buildPrice(overrides: Partial<StripePrice> = {}): StripePrice {
    return {
        id: generateId('price'),
        object: 'price',
        unit_amount: 500,
        currency: 'usd',
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
            type: 'list',
            data: []
        }
    };
}

export function buildSubscription(opts: {
    id?: string;
    customerId: string;
    priceId?: string;
    productId?: string;
    status?: string;
    price?: StripePrice;
    paymentMethod?: StripePaymentMethod | null;
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
        default_payment_method: opts.paymentMethod?.id ?? null,
        items: {
            type: 'list',
            data: [{price}]
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
