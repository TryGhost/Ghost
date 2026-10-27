import type { StripeCheckoutShippingSetting } from '@tryghost/admin-x-framework/api/stripe-checkout-config';
import {
  type CollectFormState,
  asksNoTier,
  collectFormStateOf,
  tierIdsSettingOf,
} from './collect-form';

/**
 * Shipping as it is edited. The country list is kept while "all" is chosen, so switching back
 * keeps it.
 */
export type ShippingFormState = CollectFormState & {
  countries: 'all' | 'specific';
  allowedCountries: string[];
  addressFieldKey: string | null;
  nameFieldKey: string | null;
};

export const SHIPPING_ERRORS = [
  'shippingTiers',
  'shippingCountries',
  'shippingAddressField',
  'shippingNameField',
] as const;

/** What is wrong with shipping as it is edited, by the setting it is shown under. */
export type ShippingErrors = Partial<Record<(typeof SHIPPING_ERRORS)[number], string>>;

export const shippingFormStateOf = (
  setting: StripeCheckoutShippingSetting | undefined,
): ShippingFormState => ({
  ...collectFormStateOf(setting),
  ...(setting?.collect
    ? {
        countries: setting.allowed_countries ? 'specific' : 'all',
        allowedCountries: setting.allowed_countries ?? [],
        addressFieldKey: setting.address.custom_field_key,
        nameFieldKey: setting.name.custom_field_key,
      }
    : { countries: 'all', allowedCountries: [], addressFieldKey: null, nameFieldKey: null }),
});

/** What is missing before shipping can be saved, by error key. */
export function validateShipping(state: ShippingFormState): ShippingErrors {
  if (!state.collect) {
    return {};
  }
  return {
    ...(asksNoTier(state) ? { shippingTiers: 'Choose at least one tier' } : {}),
    ...(state.countries === 'specific' && !state.allowedCountries.length
      ? { shippingCountries: 'Choose at least one country to ship to' }
      : {}),
    ...(state.addressFieldKey ? {} : { shippingAddressField: 'Choose a field' }),
    ...(state.nameFieldKey ? {} : { shippingNameField: 'Choose a field' }),
  };
}

/** The setting to save. Only called once validateShipping finds nothing missing. */
export function shippingSettingOf(state: ShippingFormState): StripeCheckoutShippingSetting {
  if (!state.collect) {
    return { collect: false };
  }
  if (!state.addressFieldKey || !state.nameFieldKey) {
    throw new Error('Shipping was saved without the fields it lands in');
  }
  return {
    collect: true,
    ...tierIdsSettingOf(state),
    ...(state.countries === 'specific' ? { allowed_countries: state.allowedCountries } : {}),
    address: { custom_field_key: state.addressFieldKey },
    name: { custom_field_key: state.nameFieldKey },
  };
}
