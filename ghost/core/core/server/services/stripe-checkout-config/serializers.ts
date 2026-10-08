import errors from '@tryghost/errors';
import { omit } from 'lodash';
import { z } from 'zod';
import { camelKeys, snakeKeys } from '../../lib/case-keys';
import { SnakeDesign } from './codec';
import { StripeCheckoutConfig, type StripeCheckoutDesign } from './models';

/**
 * The design in a request.
 *
 * `customize: false` means no design, so Stripe uses the dashboard design.
 * `customize: true` gives the design, and must include every field.
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

/**
 * A preview request: the paid tier to open a checkout for, and the design to show it in,
 * which need not be saved.
 */
export const CheckoutPreviewInput = z.strictObject({
  tier_id: z.string().regex(/^[0-9a-f]{24}$/, { error: 'Choose a tier to preview checkout for.' }),
  cadence: z.enum(['month', 'year']).default('month'),
  design: DesignInput,
});
export type CheckoutPreviewInput = z.output<typeof CheckoutPreviewInput>;

/** Parses a request body, turning the first problem into a validation error on its field. */
export function parseRequest<Schema extends z.ZodType>(
  schema: Schema,
  input: unknown,
  resource: string,
): z.output<Schema> {
  const parsed = schema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }
  const issue = parsed.error.issues[0];
  throw new errors.ValidationError({
    message: issue.message,
    property: issue.path.join('.') || resource,
  });
}

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

const CheckoutPreviewResponse = z.object({
  checkout_preview: z.tuple([z.object({ url: z.url() })]),
});

/** A preview as the Admin API returns it: the Stripe Checkout page to open. */
export const toCheckoutPreviewResponse = z
  .object({ url: z.string() })
  .transform(({ url }): z.input<typeof CheckoutPreviewResponse> => ({
    checkout_preview: [{ url }],
  }))
  .pipe(CheckoutPreviewResponse);
