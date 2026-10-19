import logging from '@tryghost/logging';
import { z } from 'zod';
import { camelKeys, snakeKeys } from '../../lib/case-keys';
import { DbJson } from '../../lib/db-types/json';
import { StripeCheckoutDesign } from './models';

/** The design's fields in snake_case, as used by the database, the Admin API and Stripe. */
export const SnakeDesign = z.object(snakeKeys(StripeCheckoutDesign.shape));

/**
 * Whether a part of the config covers every paid tier, including ones added later, or only
 * the tiers listed for it. Stored as a choice rather than read off an empty list, so a part
 * limited to some tiers never quietly widens to all of them.
 */
export const TierScope = z.enum(['all_paid', 'selected_paid']);
export type TierScope = z.infer<typeof TierScope>;

/**
 * A part of the config that can no longer be read, such as a design using a font Stripe has
 * dropped, reads as off and is logged. Checkouts then go without it until the publisher saves
 * it again, and the other parts are unaffected.
 */
function offWhenUnreadable(part: 'design' | 'shipping', message: string) {
  return ({ error }: z.core.$ZodCatchCtx) => {
    logging.warn(
      { event: { name: `stripe_checkout.${part}.unreadable` }, err: new z.ZodError(error.issues) },
      message,
    );
    return null;
  };
}

/**
 * The parts of a `stripe_checkout_config` row, each JSON or null while that part is off. They
 * are validated when read as well as when saved, so a stored value that is no longer allowed
 * never reaches Stripe. Which tiers shipping is limited to is in the tiers table, and which
 * custom fields the address and name land in are the bindings for their ports.
 */
export const ConfigRow = z.object({
  design: DbJson(
    z.codec(SnakeDesign, StripeCheckoutDesign, { decode: camelKeys, encode: snakeKeys }),
    { message: 'The stored Stripe Checkout design is not JSON.' },
  )
    .nullable()
    .catch(
      offWhenUnreadable('design', 'Ignoring a Stripe Checkout design that is no longer valid'),
    ),
  shipping: DbJson(
    z.object({
      tier_scope: TierScope,
      // A stored empty list would make Stripe refuse every checkout, so it reads as invalid.
      allowed_countries: z.array(z.string()).min(1).nullable(),
    }),
    { message: 'The stored shipping settings are not JSON.' },
  )
    .nullable()
    .catch(
      offWhenUnreadable(
        'shipping',
        'Ignoring Stripe Checkout shipping settings that are no longer valid',
      ),
    ),
});
