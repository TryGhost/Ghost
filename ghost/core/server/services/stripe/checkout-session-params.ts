import { STRIPE_ALLOWED_COUNTRIES } from '@tryghost/checkout';
import { z } from 'zod';
import { snakeKeys, type SnakeKeys } from '../../lib/case-keys';
import type {
  CheckoutAsks,
  CheckoutDefinition,
  StripeCheckoutDesign,
} from '../stripe-checkout-config';
import {
  COLLECTED_NOUNS,
  COLLECTED_SECTIONS,
  SECTION_NAMES,
} from '../stripe-checkout-config/models';

/** The Stripe Checkout session parameters that one part of a checkout can add to a session. */
export interface CheckoutSessionParams {
  branding_settings?: SnakeKeys<StripeCheckoutDesign>;
  shipping_address_collection?: { allowed_countries: string[] };
  phone_number_collection?: { enabled: true };
  tax_id_collection?: { enabled: true };
}

/**
 * The session's own parameters, set by Ghost rather than by the publisher's checkout settings,
 * that change which parameters a checkout's parts add. With `automatic_tax` enabled, for example,
 * the session already lets a business buyer give a tax ID, so the tax ID part adds nothing.
 */
export interface SessionParams {
  automatic_tax?: { enabled: boolean };
}

/**
 * The Checkout session parameters each part of a checkout adds, keyed by the part, so that a part
 * Stripe refuses can be left out of the next request whole.
 */
export type CheckoutSessionParts = {
  [Part in CheckoutPart]?: CheckoutSessionParams;
};

/**
 * A part of a checkout: its design, or one thing the publisher has the checkout ask the buyer for,
 * such as a phone number.
 */
export type CheckoutPart = 'design' | keyof CheckoutAsks;

export const CHECKOUT_PARTS: readonly CheckoutPart[] = ['design', ...COLLECTED_SECTIONS];

/**
 * The name the Admin API uses for a part, such as `tax_number`. Span attributes and log lines use
 * the same name, so one name finds a part everywhere.
 */
export const partName = (part: CheckoutPart) =>
  part === 'design' ? 'design' : SECTION_NAMES[part];

/**
 * Which parts of a checkout a Stripe refusal was about. When Stripe names the parameter it
 * refused, the refusal is about the one part that added that parameter. When Stripe names no
 * parameter, any of the parts could be the reason, so the refusal is about all of them. Stripe
 * names no parameter, for example, when it refuses what the session may save onto an existing
 * customer (`customer_update`), which Ghost works out from all of the parts together.
 */
export type Refusal =
  | { named: true; part: CheckoutPart; param: string }
  // Never empty, so that each retry leaves out at least one more part, and the retries always end.
  | { named: false; parts: [CheckoutPart, ...CheckoutPart[]] };

/**
 * The error stripe-node throws when Stripe rejects a request as invalid. `param` is the parameter
 * Stripe objected to, when Stripe names one.
 */
const StripeRefusal = z.object({
  type: z.literal('StripeInvalidRequestError'),
  param: z.string().nullish(),
});

/** Whether Stripe rejected a request as invalid, whatever the reason. */
export const isStripeRefusal = (err: unknown): boolean => StripeRefusal.safeParse(err).success;

/**
 * Whether the parameter Stripe named is `key` or a field inside it. Stripe names a field inside a
 * parameter with brackets, such as `branding_settings[font_family]`.
 */
const names = (param: string, key: string) => param === key || param.startsWith(`${key}[`);

/**
 * Works out which parts of a checkout a Stripe error was about. Returns null when the error isn't
 * about the checkout's parts: when the error isn't Stripe rejecting the request as invalid, when
 * Stripe named a parameter Ghost sets itself rather than one a part adds, or when the request
 * had no parts left to leave out.
 */
export function refusalOf(err: unknown, parts: CheckoutSessionParts): Refusal | null {
  const refusal = StripeRefusal.safeParse(err);
  if (!refusal.success) {
    return null;
  }
  const { param } = refusal.data;
  const [first, ...rest] = CHECKOUT_PARTS.filter((part) => parts[part]);
  if (!first) {
    return null;
  }
  const present: [CheckoutPart, ...CheckoutPart[]] = [first, ...rest];
  if (!param) {
    return { named: false, parts: present };
  }
  const part = present.find((candidate) =>
    Object.keys(parts[candidate] ?? {}).some((key) => names(param, key)),
  );
  return part ? { named: true, part, param } : null;
}

/** The parts to leave out of the next request after a refusal. */
export const refusedParts = (refusal: Refusal): CheckoutPart[] =>
  refusal.named ? [refusal.part] : refusal.parts;

/**
 * The error an Admin preview of checkout settings shows when Stripe refuses the preview's session,
 * and the property of the preview request the error points at. Only a refusal that names a part
 * can blame the publisher's settings. Otherwise the message stays general, because Stripe also
 * refuses sessions for reasons unrelated to the settings, such as the state of the publisher's
 * Stripe account.
 */
export function previewRefusal(refusal: Refusal | null): { message: string; property?: string } {
  if (!refusal?.named) {
    return { message: 'Stripe refused to open this checkout.' };
  }
  const { part } = refusal;
  return {
    message:
      part === 'design'
        ? 'Stripe refused this checkout design.'
        : `Stripe refused to ask for a ${COLLECTED_NOUNS[part]}.`,
    property: partName(part),
  };
}

export function withoutParts(parts: CheckoutSessionParts, refusal: Refusal): CheckoutSessionParts {
  const kept = { ...parts };
  for (const part of refusedParts(refusal)) {
    delete kept[part];
  }
  return kept;
}

/**
 * For each thing a checkout can ask the buyer for, the Checkout session parameters that make
 * Stripe ask for it.
 */
const STRIPE_PARAMS: {
  [Section in keyof CheckoutAsks]: (
    asking: NonNullable<CheckoutAsks[Section]>,
    session: SessionParams,
  ) => CheckoutSessionParams;
} = {
  shipping: ({ allowedCountries }) => ({
    shipping_address_collection: {
      // Stripe has no value meaning every country, and an empty list collects no address at all,
      // so a checkout that ships everywhere (null) sends every country Stripe accepts.
      allowed_countries: allowedCountries ?? [...STRIPE_ALLOWED_COUNTRIES],
    },
  }),
  phone: () => ({ phone_number_collection: { enabled: true } }),
  // With automatic tax, every session that takes payment already sends `tax_id_collection` in
  // its tax parameters (see `taxSessionParams`), so the tax ID part adds nothing.
  taxNumber: (_asking, session) =>
    session.automatic_tax?.enabled ? {} : { tax_id_collection: { enabled: true } },
};

/**
 * The Checkout session parameters a checkout adds, keyed by the part that adds each. With no
 * checkout, nothing is added, and Stripe uses the branding set in the publisher's Stripe
 * dashboard.
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
    const params = asking && STRIPE_PARAMS[section](asking, session);
    // A part that adds no parameters, such as a tax ID that automatic tax already asks for, isn't
    // kept as a part, so the session's span doesn't record it as applied and a refusal can't be
    // blamed on it.
    if (params && Object.keys(params).length) {
      parts[section] = params;
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
 * The tax parameters of a Checkout session that takes payment. With automatic tax on, Stripe
 * works out the tax from the buyer's address, and the session also lets a business buyer give a
 * tax ID.
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
 * The parameters of the Checkout session to create: the session's own parameters, the parameters
 * each remaining part of the checkout adds, and the `customer_update` those parameters need when
 * the session is for an existing Stripe customer.
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
 * What Stripe must be allowed to save onto an existing Stripe customer before Stripe will create
 * a session that works out tax or takes a tax ID. Stripe checks both against the customer's
 * address, and no customer Ghost creates has one, so Stripe must be allowed to save the address
 * the buyer enters, and also the shipping address when the session collects one. Stripe only
 * takes a tax ID when it may also save the business name the buyer gives with it.
 *
 * Returns null when the session needs no update: when it neither works out tax nor takes a tax
 * ID, or when it has no customer, because Stripe refuses `customer_update` on a session without
 * one.
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
