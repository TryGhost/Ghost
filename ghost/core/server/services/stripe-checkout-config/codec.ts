import type { GhostLogger } from '@tryghost/logging';
import { z } from 'zod';
import { camelKeys, snakeKeys } from '../../lib/case-keys';
import { DbJson } from '../../lib/db-types/json';
import { type CollectedPart, isStripeAllowedCountry } from '@tryghost/checkout';
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
function offWhenUnreadable(logging: GhostLogger, part: 'design' | CollectedPart, message: string) {
  return ({ error }: z.core.$ZodCatchCtx) => {
    logging.warn(
      { event: { name: `stripe_checkout.${part}.unreadable` }, err: new z.ZodError(error.issues) },
      message,
    );
    return null;
  };
}

/**
 * The parts of a `stripe_checkout_config` row that are Stripe's own, each JSON or null. They
 * are validated when read as well as when saved, so a stored value that is no longer allowed
 * never reaches Stripe. A part whose answers Ghost keeps has no tiers here: they are the tier
 * requirement it's required under.
 */
export function configRow(logging: GhostLogger) {
  return z.object({
    design: DbJson(
      z.codec(SnakeDesign, StripeCheckoutDesign, { decode: camelKeys, encode: snakeKeys }),
      { message: 'The stored Stripe Checkout design is not JSON.' },
    )
      .nullable()
      .catch(
        offWhenUnreadable(
          logging,
          'design',
          'Ignoring a Stripe Checkout design that is no longer valid',
        ),
      ),
    shipping: DbJson(
      z.object({
        // A stored empty list, or a country Stripe no longer ships to, would make Stripe refuse
        // every checkout, so either reads as invalid.
        allowed_countries: z
          .array(z.string().refine((code): boolean => isStripeAllowedCountry(code)))
          .min(1)
          .nullable(),
      }),
      { message: 'The stored shipping settings are not JSON.' },
    )
      .nullable()
      .catch(
        offWhenUnreadable(
          logging,
          'shipping',
          'Ignoring Stripe Checkout shipping settings that are no longer valid',
        ),
      ),
    tax_number: DbJson(z.object({ tier_scope: TierScope }), {
      message: 'The stored tax ID settings are not JSON.',
    })
      .nullable()
      .catch(
        offWhenUnreadable(
          logging,
          'tax_number',
          'Ignoring Stripe Checkout tax ID settings that are no longer valid',
        ),
      ),
  });
}
export type ConfigRowSchema = ReturnType<typeof configRow>;
