import errors from '@tryghost/errors';
import { z } from 'zod';
import { STRIPE_PORT, type StripePort } from '@tryghost/checkout';
import { INTERNAL } from '../members-metafields';
import type { ResolvedCheckout } from '../tier-checkout-config';

/**
 * What a member has to supply to move onto a tier, and what happens to it.
 *
 * Ghost only sends someone through a payment page when they are not already paying, so a
 * member changing tier never meets the page that would have asked them for a delivery
 * address. This is where they are asked instead.
 *
 * A service rather than part of the request handler, because none of it is a question
 * about HTTP. Which values a tier needs, whether this member already gave them, and where
 * they are kept are facts about members and tiers, and the answers are the same whoever
 * asks. The handler that owns this route has not been moved onto Ghost's API framework
 * yet; keeping the decisions here means that move carries glue rather than policy.
 */

/**
 * What a client sends, named the way the tier payload names it, so the same words describe
 * what a tier collects and what was collected for it.
 *
 * Loose about the parts of an address on purpose. What a given field will accept is the
 * field catalog's to say, and it says so on the way in — restating it here would be a
 * second opinion that can disagree with the first.
 */
const Supplied = z.object({
  shipping: z
    .object({
      name: z.string().optional(),
      address: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
  phone: z.string().optional(),
});
export type Supplied = z.infer<typeof Supplied>;

/** One thing a tier collects: the name it is collected under, and the field holding it. */
interface Wanted {
  port: StripePort;
  key: string;
}

interface MetafieldValues {
  getValuesForMembers(
    memberIds: string[],
    audience: unknown,
  ): Promise<Map<string, Record<string, Record<string, unknown>>>>;
}

interface MetafieldBindings {
  writeSuppliedByMember(
    memberId: string,
    productId: string,
    supplied: Array<{ port: string; value: unknown }>,
  ): Promise<void>;
}

interface TierCheckout {
  resolve(productId: string): Promise<ResolvedCheckout>;
}

/**
 * The tiers service wrapper, not the checkout settings it builds.
 *
 * Members and tiers are initialised together, so the property does not exist yet while
 * this is being constructed — reading it here would capture undefined and every tier
 * change would fail on it. Held as the wrapper and read when a request arrives.
 */
interface TiersService {
  checkout?: TierCheckout;
}

export interface TierChangeCollectionDeps {
  tiersService: TiersService;
  values: MetafieldValues;
  bindings: MetafieldBindings;
}

export class TierChangeCollection {
  #tiersService: TiersService;
  #values: MetafieldValues;
  #bindings: MetafieldBindings;

  constructor({ tiersService, values, bindings }: TierChangeCollectionDeps) {
    this.#tiersService = tiersService;
    this.#values = values;
    this.#bindings = bindings;
  }

  /**
   * Store what a member supplied for the tier they are moving onto, or refuse the move.
   *
   * Refusing rather than collecting nothing, because a tier that ships something is
   * useless without somewhere to ship it, and a publisher finding that out when they come
   * to post the first issue is the failure this exists to prevent.
   *
   * Called only when the member is moving onto a tier they do not already hold. Changing
   * cadence on a tier they are already on asks for nothing: they are not arriving
   * anywhere new, and being made to retype an address to move from monthly to yearly
   * would be a tax on a change that collects nothing.
   */
  async collect(memberId: string, productId: string, body: unknown): Promise<void> {
    const checkout = this.#tiersService.checkout;
    if (!checkout) {
      return;
    }

    const wanted = wantedBy(await checkout.resolve(productId));
    if (wanted.length === 0) {
      return;
    }

    const supplied = suppliedByPort(parseSupplied(body));
    const held = await this.heldKeys(memberId);

    const missing = wanted.filter((want) => !supplied.has(want.port) && !held.has(want.key));
    if (missing.length > 0) {
      throw new errors.ValidationError({
        message: 'This tier needs more information before you can move onto it.',
        property: 'collected',
        context: missing.map((want) => want.port).join(', '),
      });
    }

    const writing = wanted
      .filter((want) => supplied.has(want.port))
      .map((want) => ({ port: want.port, value: supplied.get(want.port) }));

    if (writing.length > 0) {
      await this.#bindings.writeSuppliedByMember(memberId, productId, writing);
    }
  }

  /** Which of the publisher's fields this member already holds a value for. */
  private async heldKeys(memberId: string): Promise<Set<string>> {
    const byMember = await this.#values.getValuesForMembers([memberId], INTERNAL);
    const namespaces = byMember.get(memberId) ?? {};
    return new Set(
      Object.values(namespaces).flatMap((fields) =>
        Object.entries(fields)
          .filter(([, value]) => value !== null && value !== undefined)
          .map(([key]) => key),
      ),
    );
  }
}

/**
 * What the tier collects, as pairs of the name a value arrives under and the field it
 * belongs in. Both halves are needed: the name is what a client sends, and the field is
 * what says whether this member already gave it.
 */
function wantedBy(checkout: ResolvedCheckout): Wanted[] {
  return [
    ...(checkout.shipping
      ? [
          { port: STRIPE_PORT.shippingName, key: checkout.shipping.nameCustomFieldKey },
          { port: STRIPE_PORT.shippingAddress, key: checkout.shipping.addressCustomFieldKey },
        ]
      : []),
    ...(checkout.phone ? [{ port: STRIPE_PORT.phone, key: checkout.phone.customFieldKey }] : []),
  ];
}

/**
 * The same shape a completed payment page is read into, so both ways of collecting hand
 * the same pairs to the same writer and a value cannot land differently depending on
 * which asked for it.
 */
function suppliedByPort(supplied: Supplied): Map<StripePort, unknown> {
  const byPort = new Map<StripePort, unknown>();

  if (supplied.shipping?.name) {
    byPort.set(STRIPE_PORT.shippingName, supplied.shipping.name);
  }
  if (supplied.shipping?.address && Object.keys(supplied.shipping.address).length > 0) {
    byPort.set(STRIPE_PORT.shippingAddress, supplied.shipping.address);
  }
  if (supplied.phone) {
    byPort.set(STRIPE_PORT.phone, supplied.phone);
  }

  return byPort;
}

function parseSupplied(body: unknown): Supplied {
  if (body === undefined || body === null) {
    return {};
  }

  const parsed = Supplied.safeParse(body);
  if (parsed.success) {
    return parsed.data;
  }

  const issue = parsed.error.issues[0];
  throw new errors.ValidationError({
    message: issue.message,
    property: ['collected', ...issue.path].join('.'),
  });
}
