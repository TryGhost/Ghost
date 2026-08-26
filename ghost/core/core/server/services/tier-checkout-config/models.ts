import { z } from 'zod';
import { FieldTypeSchema } from '@tryghost/custom-field-types';

export const CheckoutQuestion = z.object({
  key: z.string(),
  label: z.string().nullable(),
  optional: z.boolean(),
});
export type CheckoutQuestion = z.infer<typeof CheckoutQuestion>;

/**
 * One toggle and two destinations: a processor returns the recipient and the address
 * under one parameter, but a publisher keeps a name and an address in different fields.
 */
export const ShippingCollection = z.object({
  /** ISO 3166-1 alpha-2. A processor will not render an address form without them. */
  allowedCountries: z.array(z.string()),
  nameCustomFieldKey: z.string(),
  addressCustomFieldKey: z.string(),
});
export type ShippingCollection = z.infer<typeof ShippingCollection>;

export const PhoneCollection = z.object({
  customFieldKey: z.string(),
});
export type PhoneCollection = z.infer<typeof PhoneCollection>;

export const TierCheckoutConfig = z.object({
  tierId: z.string(),
  customFields: z.array(CheckoutQuestion),
  shipping: ShippingCollection.nullable(),
  /** Stripe keeps a tax number against the customer it invoices; Ghost never stores one. */
  taxNumber: z.boolean(),
  phone: PhoneCollection.nullable(),
});
export type TierCheckoutConfig = z.infer<typeof TierCheckoutConfig>;

export const emptyCollection = (): Pick<
  TierCheckoutConfig,
  'shipping' | 'taxNumber' | 'phone'
> => ({
  shipping: null,
  taxNumber: false,
  phone: null,
});

export const emptyCheckoutConfig = (tierId: string): TierCheckoutConfig => ({
  tierId,
  customFields: [],
  ...emptyCollection(),
});

export const CheckoutOptions = z.object({
  shippingAllowedCountries: z.array(z.string()),
  taxNumber: z.boolean(),
});
export type CheckoutOptions = z.infer<typeof CheckoutOptions>;

export const ResolvedQuestion = CheckoutQuestion.extend({
  prompt: z.string(),
  type: FieldTypeSchema,
});
export type ResolvedQuestion = z.infer<typeof ResolvedQuestion>;

export const ResolvedCheckout = z.object({
  customFields: z.array(ResolvedQuestion),
  shipping: ShippingCollection.nullable(),
  taxNumber: z.boolean(),
  phone: PhoneCollection.nullable(),
});
export type ResolvedCheckout = z.infer<typeof ResolvedCheckout>;
