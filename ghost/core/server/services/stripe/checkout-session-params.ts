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
  [Part in CheckoutPart]?: CheckoutSessionParams;
};

/** A part of a checkout: its design, or something it asks the buyer for. */
export type CheckoutPart = 'design' | keyof CheckoutAsks;

/** Every part a checkout can have. */
export const CHECKOUT_PARTS: readonly CheckoutPart[] = ['design', ...COLLECTED_SECTIONS];

/** A part's name in the Admin API, which metrics and logs use too. */
export const partName = (part: CheckoutPart) =>
  part === 'design' ? 'design' : SECTION_NAMES[part];

/**
 * The parts of a checkout Stripe refused a session over: the one whose parameter it named, or
 * every part when it named no parameter, as any of them could be why. Stripe names none when it
 * refuses what a checkout may save onto an existing customer, which Ghost works out from all of
 * the parts together.
 */
export type Refusal =
  | { named: true; part: CheckoutPart; param: string }
  // Never empty, so every retry leaves out at least one part and the retries come to an end.
  | { named: false; parts: [CheckoutPart, ...CheckoutPart[]] };

/** The error Stripe throws for a session it refuses as invalid, naming the parameter if it can. */
const StripeRefusal = z.object({
  type: z.literal('StripeInvalidRequestError'),
  param: z.string().nullish(),
});

/** Whether Stripe refused a session as invalid, for any reason. */
export const isStripeRefusal = (err: unknown): boolean => StripeRefusal.safeParse(err).success;

/** Whether Stripe's refusal names this parameter, or a field inside it. */
const names = (param: string, key: string) => param === key || param.startsWith(`${key}[`);

/**
 * The parts of a checkout Stripe refused a session over, or null when the refusal isn't the
 * checkout's: Stripe named a parameter of the session's own, refused it for another reason, or
 * the session had no parts left.
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

/** The parts a refusal leaves a session without. */
export const refusedParts = (refusal: Refusal): CheckoutPart[] =>
  refusal.named ? [refusal.part] : refusal.parts;

/**
 * What a preview says when Stripe refuses it, and the request property naming the part it
 * refused. Without a named part, or with no refusal of a part at all, it can't say the settings
 * are why, as Stripe also refuses sessions for reasons of the session's or account's own.
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

/** The parts of a checkout without those a refusal leaves out. */
export function withoutParts(parts: CheckoutSessionParts, refusal: Refusal): CheckoutSessionParts {
  const kept = { ...parts };
  for (const part of refusedParts(refusal)) {
    delete kept[part];
  }
  return kept;
}

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
    const params = asking && STRIPE_PARAMS[section](asking, session);
    // A part that adds nothing, such as a tax ID automatic tax already asks for, isn't one the
    // session can go without.
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
