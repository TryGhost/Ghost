import type { GhostLogger } from '@tryghost/logging';
import { z } from 'zod';
import { camelKeys, snakeKeys } from '../../lib/case-keys';
import { DbJson } from '../../lib/db-types/json';
import { StripeCheckoutDesign } from './models';

/** The design's fields in snake_case, as used by the database, the Admin API and Stripe. */
export const SnakeDesign = z.object(snakeKeys(StripeCheckoutDesign.shape));

/**
 * The parts of a `stripe_checkout_config` row that are Stripe's own, each JSON or null. They
 * are validated when read as well as when saved, so a stored value that is no longer allowed
 * never reaches Stripe. The collected parts have no column here: their tiers and options are the
 * tier requirement each is required under.
 *
 * A design that can no longer be read, such as one using a font Stripe has dropped, reads as
 * none and is logged. Checkouts then use the Stripe dashboard's design until the publisher saves
 * one again.
 */
export function configRow(logging: GhostLogger) {
  return z.object({
    design: DbJson(
      z.codec(SnakeDesign, StripeCheckoutDesign, { decode: camelKeys, encode: snakeKeys }),
      { message: 'The stored Stripe Checkout design is not JSON.' },
    )
      .nullable()
      .catch(({ error }) => {
        logging.warn(
          {
            event: { name: 'stripe_checkout.design.unreadable' },
            err: new z.ZodError(error.issues),
          },
          'Ignoring a Stripe Checkout design that is no longer valid',
        );
        return null;
      }),
  });
}
export type ConfigRowSchema = ReturnType<typeof configRow>;
