/**
 * What Stripe Checkout will render, measured rather than read.
 *
 * Every number here came from probing the live API at Ghost's pinned version, not from the
 * reference or the published OpenAPI spec — the spec disagreed with the API in three of five
 * probes, missing the field cap and the key format entirely. A wrong bound is not cosmetic:
 * an over-long label fails the session create, which fails the checkout.
 */

/**
 * What Stripe calls itself when it writes.
 *
 * One constant for two uses that must agree: it selects the bindings Stripe's checkout
 * routes through, and it is recorded on every value that arrives that way.
 */
export const STRIPE_SOURCE = 'stripe';

/**
 * What Stripe returns to us under its own names, and the only names a binding for this
 * writer may use.
 *
 * A closed set per writer rather than one global vocabulary: what a writer calls the thing
 * it collects belongs to that writer, which is why a binding is keyed on both. Stated as a
 * union so every join predicate, every reader and every constant is checked against the
 * same list — a rename that reached only one of them would stop the write and the read
 * meeting, with nothing to raise, because an unrecognised port is deliberately not an error.
 */
export const STRIPE_PORTS = ['shipping_name', 'shipping_address', 'tax_number', 'phone'] as const;
export type StripePort = typeof STRIPE_PORTS[number];

/** The same names, for the places that need one rather than the list. */
export const STRIPE_PORT = {
    shippingName: 'shipping_name',
    shippingAddress: 'shipping_address',
    taxNumber: 'tax_number',
    phone: 'phone'
} as const satisfies Record<string, StripePort>;

/** Stripe rejects a fourth. */
export const MAX_CHECKOUT_CUSTOM_FIELDS = 3;

/**
 * Stripe caps a custom label at 50 characters and our field names at 191, so a publisher can
 * name a field something that cannot be asked. A tier's question carries its own label for
 * exactly this, and this is the bound it is held to.
 */
export const MAX_CHECKOUT_LABEL_LENGTH = 50;

/**
 * The field types Stripe Checkout can ask for. `long_text` is missing because Stripe's text
 * input caps shorter than that type allows, and `address` because Stripe has no custom-field
 * equivalent — an address is collected through its own parameter instead.
 */
export const CHECKOUT_ELIGIBLE_FIELD_TYPES = ['short_text'] as const;
