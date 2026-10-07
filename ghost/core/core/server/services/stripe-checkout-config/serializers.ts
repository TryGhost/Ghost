import { omit } from 'lodash';
import { z } from 'zod';
import { camelKeys, snakeKeys } from '../../lib/case-keys';
import { SnakeDesign } from './codec';
import { StripeCheckoutConfig, type StripeCheckoutDesign } from './models';

/**
 * The design in an edit request.
 *
 * `customize: false` clears the design, so Stripe uses the dashboard design again.
 * `customize: true` sets the design, and must include every field.
 */
const DesignInput = z
  .discriminatedUnion('customize', [
    z.strictObject({ customize: z.literal(false) }),
    z.strictObject({ customize: z.literal(true), ...SnakeDesign.shape }),
  ])
  .transform((input): StripeCheckoutDesign | null =>
    input.customize ? camelKeys(omit(input, 'customize')) : null,
  );

/** An edit request. Parts it leaves out are not changed. */
export const CheckoutConfigInput = z.strictObject({
  design: DesignInput.optional(),
});
export type CheckoutConfigInput = z.output<typeof CheckoutConfigInput>;

const CheckoutConfigResource = z.object({
  design: z.discriminatedUnion('customize', [
    z.object({ customize: z.literal(false) }),
    SnakeDesign.extend({ customize: z.literal(true) }),
  ]),
});

const CheckoutConfigResponse = z.object({
  checkout_config: z.tuple([CheckoutConfigResource]),
});

/**
 * The config as the Admin API returns it. Every part says whether it is set, so a client can
 * save back exactly what it read.
 */
export const toCheckoutConfigResponse = StripeCheckoutConfig.transform(
  (config): z.input<typeof CheckoutConfigResponse> => ({
    checkout_config: [
      {
        design: config.design
          ? { customize: true as const, ...snakeKeys(config.design) }
          : { customize: false as const },
      },
    ],
  }),
).pipe(CheckoutConfigResponse);
