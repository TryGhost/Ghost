import type { ErrorMessages } from '@tryghost/admin-x-framework/hooks';
import type {
  StripeCheckoutPreviewShipping,
  StripeCheckoutShippingSetting,
} from '@tryghost/admin-x-framework/api/stripe-checkout-config';
import type { Tier } from '@tryghost/admin-x-framework/api/tiers';

/**
 * Shipping as it is edited. `allTiers` is every paid tier, including tiers added later, shown as
 * every tier ticked; otherwise `tierIds` are the tiers ticked. The country list is kept while
 * "all" is chosen, so switching back keeps it.
 */
export type ShippingFormState = {
  collect: boolean;
  allTiers: boolean;
  tierIds: string[];
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

export const shippingFormStateOf = (
  setting: StripeCheckoutShippingSetting | undefined,
): ShippingFormState =>
  setting?.collect
    ? {
        collect: true,
        allTiers: !setting.tier_ids,
        tierIds: setting.tier_ids ?? [],
        countries: setting.allowed_countries ? 'specific' : 'all',
        allowedCountries: setting.allowed_countries ?? [],
        addressFieldKey: setting.address.custom_field_key,
        nameFieldKey: setting.name.custom_field_key,
      }
    : {
        collect: false,
        allTiers: true,
        tierIds: [],
        countries: 'all',
        allowedCountries: [],
        addressFieldKey: null,
        nameFieldKey: null,
      };

/** What is missing before shipping can be saved, by error key. */
export function validateShipping(state: ShippingFormState): ErrorMessages {
  if (!state.collect) {
    return {};
  }
  return {
    ...(!state.allTiers && !state.tierIds.length
      ? { shippingTiers: 'Choose at least one tier' }
      : {}),
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
    ...(state.allTiers ? {} : { tier_ids: state.tierIds }),
    ...(state.countries === 'specific' ? { allowed_countries: state.allowedCountries } : {}),
    address: { custom_field_key: state.addressFieldKey },
    name: { custom_field_key: state.nameFieldKey },
  };
}

/** Shipping as it's being edited, for Preview in Stripe, whether or not it could be saved yet. */
export function previewShippingOf(state: ShippingFormState): StripeCheckoutPreviewShipping {
  if (!state.collect || (!state.allTiers && !state.tierIds.length)) {
    return { collect: false };
  }
  return {
    collect: true,
    ...(state.allTiers ? {} : { tier_ids: state.tierIds }),
    ...(state.countries === 'specific' && state.allowedCountries.length
      ? { allowed_countries: state.allowedCountries }
      : {}),
  };
}

/**
 * The tiers the sketch tags the shipping address with: empty when it is asked on every paid
 * tier, so there is nothing to tag.
 */
export function shippingAudience(state: ShippingFormState, tiers: Tier[]): string {
  if (state.allTiers) {
    return '';
  }
  return tiers
    .filter((tier) => state.tierIds.includes(tier.id))
    .map((tier) => tier.name)
    .join(', ');
}

/**
 * The tiers ticked in "Collect for" as the picker changes them. Ticking every active paid tier
 * means every paid tier, so tiers added later are covered too.
 */
export function tierChoiceOf(
  tierIds: string[],
  activeTierIds: string[],
): Pick<ShippingFormState, 'allTiers' | 'tierIds'> {
  const allTiers = activeTierIds.length > 0 && activeTierIds.every((id) => tierIds.includes(id));
  return { allTiers, tierIds };
}
