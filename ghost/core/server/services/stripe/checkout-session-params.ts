import { STRIPE_ALLOWED_COUNTRIES } from '@tryghost/checkout';
import { snakeKeys, type SnakeKeys } from '../../lib/case-keys';
import type {
  CheckoutAsks,
  CheckoutDefinition,
  StripeCheckoutDesign,
} from '../stripe-checkout-config';
import { COLLECTED_SECTIONS } from '../stripe-checkout-config/models';

/** The Checkout session parameters a part of Ghost's checkout settings adds. */
export interface CheckoutSessionParams {
  branding_settings?: SnakeKeys<StripeCheckoutDesign>;
  shipping_address_collection?: { allowed_countries: string[] };
  phone_number_collection?: { enabled: true };
  tax_id_collection?: { enabled: true };
}

/** The parameters of the session a checkout's own are added to that decide how they ask. */
export interface SessionParams {
  automatic_tax?: { enabled: boolean };
}

/**
 * The Checkout session parameters each part of a checkout adds: its design, and each part it
 * asks the buyer for. A part Stripe refuses is left out whole, so a parameter that only works
 * beside another never goes without it.
 */
export type CheckoutSessionParts = {
  [Part in 'design' | keyof CheckoutAsks]?: CheckoutSessionParams;
};

/** The Checkout session parameters that ask for each collected part a checkout asks for. */
const STRIPE_PARAMS: {
  [Section in keyof CheckoutAsks]: (
    asking: NonNullable<CheckoutAsks[Section]>,
    session: SessionParams,
  ) => CheckoutSessionParams;
} = {
  shipping: ({ allowedCountries }) => ({
    shipping_address_collection: {
      // Stripe has no way to say everywhere, and a checkout without countries collects no
      // address, so everywhere is every country Stripe accepts.
      allowed_countries: allowedCountries ?? [...STRIPE_ALLOWED_COUNTRIES],
    },
  }),
  phone: () => ({ phone_number_collection: { enabled: true } }),
  // Automatic tax already lets a business buyer give a tax ID, in the tax parameters every
  // session that takes payment sends.
  taxNumber: (_asking, session) =>
    session.automatic_tax?.enabled ? {} : { tax_id_collection: { enabled: true } },
};

/**
 * The Checkout session parameters a checkout adds to a session, by the part that adds them: its
 * design as `branding_settings`, and what it asks the buyer for. Without a checkout there are
 * none, so Stripe uses the merchant's own settings.
 */
export function checkoutSessionParts(
  checkout: CheckoutDefinition | null,
  session: SessionParams,
): CheckoutSessionParts {
  if (!checkout) {
    return {};
  }
  const parts: CheckoutSessionParts = checkout.design
    ? { design: { branding_settings: snakeKeys(checkout.design) } }
    : {};
  const ask = <Section extends keyof CheckoutAsks>(section: Section) => {
    const asking = checkout.asks[section];
    if (asking) {
      parts[section] = STRIPE_PARAMS[section](asking, session);
    }
  };
  COLLECTED_SECTIONS.forEach(ask);
  return parts;
}

/** Whether Stripe works out a session's tax. */
export interface SessionTax {
  automaticTax: boolean;
}

/** The parameters every Checkout session that takes payment sends for tax. */
export interface TaxSessionParams {
  automatic_tax: { enabled: boolean };
  tax_id_collection?: { enabled: true };
}

/**
 * The tax parameters of a Checkout session that takes payment. With automatic tax, Stripe
 * works out the tax from the buyer's address and lets a business buyer give a tax ID.
 */
export function taxSessionParams({ automaticTax }: SessionTax): TaxSessionParams {
  if (!automaticTax) {
    return { automatic_tax: { enabled: false } };
  }
  return { automatic_tax: { enabled: true }, tax_id_collection: { enabled: true } };
}

/** The parameters of a session that decide what Checkout must save onto an existing customer. */
export interface CustomerSessionParams
  extends
    SessionParams,
    Pick<CheckoutSessionParams, 'tax_id_collection' | 'shipping_address_collection'> {
  customer?: string;
}

/** What Checkout saves onto an existing customer from what the buyer enters. */
export interface CustomerUpdate {
  address?: 'auto';
  name?: 'auto';
  shipping?: 'auto';
}

/**
 * The Checkout session to create: the session's own parameters with those each part of its
 * checkout adds, and what Stripe has to be allowed to save onto an existing customer for them.
 */
export function sessionCreateParams<Params extends CustomerSessionParams>(
  params: Params,
  parts: CheckoutSessionParts,
): CheckoutSessionParams & Params & { customer_update?: CustomerUpdate } {
  const asked = Object.values(parts).reduce<CheckoutSessionParams>(
    (all, part) => ({ ...all, ...part }),
    {},
  );
  const session = { ...asked, ...params };
  const update = customerUpdateOf(session);
  return update ? { ...session, customer_update: update } : session;
}

/**
 * What Stripe has to be allowed to save onto an existing customer before it creates a session
 * that works out tax or takes a tax ID. Stripe checks both against the customer's address, which
 * no customer Ghost makes holds, and against the shipping address once the session collects one,
 * and takes a tax ID only once it may save the business name. Stripe refuses an update on a
 * session without a customer.
 */
function customerUpdateOf(session: CustomerSessionParams): CustomerUpdate | null {
  const takesTaxId = Boolean(session.tax_id_collection?.enabled);
  if (!session.customer || !(takesTaxId || session.automatic_tax?.enabled)) {
    return null;
  }
  return {
    address: 'auto',
    ...(takesTaxId ? { name: 'auto' } : {}),
    ...(session.shipping_address_collection ? { shipping: 'auto' } : {}),
  };
}
