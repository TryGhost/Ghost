import { z } from 'zod';

/**
 * How the fake Stripe server reads request bodies.
 *
 * Stripe's SDK sends form-encoded bodies, so two things are always true of what
 * arrives: every scalar is a string, and bracket-notation arrays sometimes parse as
 * objects keyed by index rather than as arrays.
 *
 * Every schema here therefore coerces and falls back instead of rejecting. The fake
 * must not be stricter than Stripe, or a test fails on a request the real API would
 * have accepted. Where Stripe genuinely does reject, the server says so explicitly
 * rather than relying on a schema, because the limits involved are measured against
 * the API and are not all expressible here.
 */

/** Bracket-notation arrays can arrive as `{0: ..., 1: ...}`; both mean a list. */
const asArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) {
    return value;
  }
  if (value && typeof value === 'object') {
    return Object.values(value);
  }
  return [];
};

const list = <T extends z.ZodTypeAny>(item: T) => z.preprocess(asArray, z.array(item));

const str = z.string().optional().catch(undefined);

const bool = (fallback: boolean) =>
  z
    .preprocess(
      (value) => (value === 'true' ? true : value === 'false' ? false : value),
      z.boolean(),
    )
    .catch(fallback);

const optionalBool = z
  .preprocess((value) => (value === 'true' ? true : value === 'false' ? false : value), z.boolean())
  .optional()
  .catch(undefined);

const num = z
  .preprocess(
    (value) => (typeof value === 'string' && value.trim() !== '' ? Number(value) : value),
    z.number().finite(),
  )
  .optional()
  .catch(undefined);

/** Stripe stringifies scalar metadata values and ignores anything else. */
const metadata = z
  .preprocess(
    (value) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return {};
      }
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .filter(([, entry]) => ['string', 'number', 'boolean'].includes(typeof entry))
          .map(([key, entry]) => [key, String(entry)]),
      );
    },
    z.record(z.string(), z.string()),
  )
  .catch({});

/**
 * Parse a request body, falling back to an all-defaults parse if the body is not an
 * object at all. Every field carries its own fallback, so parsing `{}` yields the
 * defaults rather than throwing, which keeps a malformed body from failing a request
 * Stripe itself would have accepted.
 */
export function parseBody<T extends z.ZodType>(schema: T, body: unknown): z.infer<T> {
  const result = schema.safeParse(body);
  return result.success ? result.data : schema.parse({});
}

export const PRICE_INTERVALS = ['day', 'week', 'month', 'year'] as const;

export const CreateProductSchema = z.object({
  active: bool(true),
  name: z.string().catch('Test Product'),
});

export const CreatePriceSchema = z.object({
  product: str,
  active: bool(true),
  nickname: z.string().nullable().catch(null),
  currency: z
    .string()
    .transform((value) => value.toLowerCase())
    .catch('usd'),
  unit_amount: num,
  recurring: z
    .object({ interval: z.enum(PRICE_INTERVALS).optional().catch(undefined) })
    .optional()
    .catch(undefined),
  custom_unit_amount: z
    .preprocess(
      (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : null),
      z.object({ enabled: bool(false), preset: num }).nullable(),
    )
    .catch(null),
});

export const CreateCustomerSchema = z.object({
  email: z.string().catch('test@example.com'),
  name: z.string().catch('Test User'),
});

export const CreateCheckoutSessionSchema = z.object({
  mode: z.enum(['payment', 'setup', 'subscription']).catch('payment'),
  customer: str,
  customer_email: str,
  success_url: z.string().catch('http://localhost:2368/?stripe=success'),
  cancel_url: z.string().catch('http://localhost:2368/?stripe=cancel'),
  metadata,
  submit_type: z.enum(['auto', 'book', 'donate', 'pay', 'send']).optional().catch(undefined),
  discounts: list(z.object({ coupon: str }))
    .transform((items) =>
      items.map((item) => ({ coupon: item.coupon ?? '' })).filter((item) => item.coupon),
    )
    .optional()
    .catch(undefined),
  line_items: list(
    z.object({
      price: str,
      price_data: z.object({ currency: str, unit_amount: num }).optional().catch(undefined),
      quantity: num,
    }),
  )
    .transform((items) =>
      items
        .map((item) => {
          const currency = item.price_data?.currency;
          const unitAmount = item.price_data?.unit_amount;
          return {
            price: item.price,
            ...(currency && unitAmount !== undefined
              ? { price_data: { currency, unit_amount: unitAmount } }
              : {}),
            quantity: item.quantity ?? 1,
          };
        })
        .filter((item) => item.price || item.price_data),
    )
    .optional()
    .catch(undefined),
  subscription_data: z
    .object({
      trial_from_plan: bool(false),
      trial_period_days: num,
      items: list(z.object({ plan: str })),
      metadata,
    })
    .transform((data) => ({
      ...(data.trial_from_plan ? { trial_from_plan: true } : {}),
      ...(typeof data.trial_period_days === 'number'
        ? { trial_period_days: data.trial_period_days }
        : {}),
      items: data.items.map((item) => ({ plan: item.plan ?? '' })).filter((item) => item.plan),
      metadata: data.metadata,
    }))
    .optional()
    .catch(undefined),
  invoice_creation: z
    .object({
      enabled: bool(false),
      invoice_data: z.object({ metadata }).optional().catch(undefined),
    })
    // `invoice_data` is only carried when it holds something: Ghost asserts on its
    // absence as well as its contents, and an empty object is not the same as none.
    .transform((data) => {
      const invoiceMetadata = data.invoice_data?.metadata ?? {};
      return {
        enabled: data.enabled,
        ...(Object.keys(invoiceMetadata).length > 0
          ? { invoice_data: { metadata: invoiceMetadata } }
          : {}),
      };
    })
    .optional()
    .catch(undefined),
  custom_fields: list(
    z.object({
      key: z.string().catch(''),
      type: z.literal('text').catch('text'),
      optional: bool(false),
      label: z.object({ custom: str }).optional().catch(undefined),
      text: z.object({ value: str }).optional().catch(undefined),
    }),
  )
    .transform((fields) =>
      fields.map((field) => ({
        key: field.key,
        type: field.type,
        optional: field.optional,
        ...(field.label?.custom ? { label: { custom: field.label.custom } } : {}),
        ...(field.text?.value ? { text: { value: field.text.value } } : {}),
      })),
    )
    .optional()
    .catch(undefined),
  customer_update: z.unknown().optional(),
  shipping_address_collection: z.unknown().optional(),
  tax_id_collection: z.unknown().optional(),
});

export const UpdateSubscriptionSchema = z.object({
  items: list(z.object({ id: str, price: str })).transform((items) =>
    items
      .map((item) => ({ id: item.id ?? '', price: item.price ?? '' }))
      .filter((item) => item.id && item.price),
  ),
  metadata: z.unknown().optional(),
  cancel_at_period_end: optionalBool,
  default_payment_method: str,
});

export type CreateProductRequest = z.infer<typeof CreateProductSchema>;
export type CreatePriceRequest = z.infer<typeof CreatePriceSchema>;
export type CreateCustomerRequest = z.infer<typeof CreateCustomerSchema>;
export type CreateCheckoutSessionRequest = z.infer<typeof CreateCheckoutSessionSchema>;
export type UpdateSubscriptionRequest = z.infer<typeof UpdateSubscriptionSchema>;
