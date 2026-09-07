import { Meta, createMutation, createQuery } from '../utils/api/hooks';

/**
 * A tier's checkout configuration, as the API serves and takes it.
 *
 * Mirrors the server's wire shape (tier-checkout-config/serializers.ts): each collectable
 * thing is its own named block, present in a response only when the tier collects it, so
 * a client reads presence rather than a flag. A write states only the blocks it wants to
 * change; an unnamed block is left alone.
 */

export type TierCheckoutQuestion = {
  key: string;
  label: string | null;
  optional: boolean;
};

export type TierCheckoutCollection = {
  collect: true;
  custom_field_key: string;
};

export type TierCheckoutConfig = {
  tier_id: string;
  custom_fields: TierCheckoutQuestion[];
  /**
   * One toggle for the shipping step, two destinations: the processor collects the
   * recipient name and the address together, and each lands in its own field.
   */
  shipping?: {
    collect: true;
    /** Absent means everywhere the processor ships; a list is a restriction. */
    allowed_countries?: string[];
    name: { custom_field_key: string };
    address: { custom_field_key: string };
  };
  /**
   * The tax number itself stays on Stripe, against the member's invoices; Ghost only
   * records that the checkout asks for one, so there is no destination to name.
   */
  tax_number?: { collect: true };
  phone?: TierCheckoutCollection;
};

/** The blocks a write may state. `collect: false` turns a collection off. */
export type TierCheckoutConfigInput = {
  custom_fields?: Array<{ key: string; label?: string | null; optional?: boolean }>;
  shipping?:
    | { collect: false }
    | {
        collect: true;
        /** Omit to deliver everywhere. An empty list is refused, not read as everywhere. */
        allowed_countries?: string[];
        name: { custom_field_key: string };
        address: { custom_field_key: string };
      };
  tax_number?: { collect: boolean };
  phone?: { collect: false } | { collect: true; custom_field_key: string };
};

export interface TiersCheckoutConfigResponseType {
  meta?: Meta;
  tiers_checkout_config: TierCheckoutConfig[];
}

const dataType = 'TiersCheckoutConfigResponseType';

// Every tier's configuration in one read, so a tier list needs one request.
export const useBrowseTiersCheckoutConfig = createQuery<TiersCheckoutConfigResponseType>({
  dataType,
  path: '/tiers/checkout_config/',
});

export const useEditTierCheckoutConfig = createMutation<
  TiersCheckoutConfigResponseType,
  { tierId: string; config: TierCheckoutConfigInput }
>({
  method: 'PUT',
  path: ({ tierId }) => `/tiers/${tierId}/checkout_config/`,
  body: ({ config }) => ({ tiers_checkout_config: [config] }),
  invalidateQueries: { dataType },
});
