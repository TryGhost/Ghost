import { z } from 'zod';
import { camelKeys, snakeKeys } from '../../lib/case-keys';
import { DbJson } from '../../lib/db-types/json';
import { StripeCheckoutDesign } from './models';

/** The design's fields in snake_case, as used by the database, the Admin API and Stripe. */
export const SnakeDesign = z.object(snakeKeys(StripeCheckoutDesign.shape));

/**
 * The `design` column. It is validated when read as well as when saved, so a stored value
 * that is no longer allowed never reaches Stripe.
 */
export const DesignColumn = z.object({
  design: DbJson(
    z.codec(SnakeDesign, StripeCheckoutDesign, { decode: camelKeys, encode: snakeKeys }),
    { message: 'The stored Stripe Checkout design is not JSON.' },
  ).nullable(),
});
