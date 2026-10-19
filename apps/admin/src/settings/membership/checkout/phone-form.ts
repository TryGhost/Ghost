import type {
  StripeCheckoutPhoneSetting,
  StripeCheckoutPreviewPhone,
} from '@tryghost/admin-x-framework/api/stripe-checkout-config';
import {
  type CollectFormState,
  asksNoTier,
  collectFormStateOf,
  tierIdsSettingOf,
} from './collect-form';

/** The phone number as it is edited. */
export type PhoneFormState = CollectFormState & { fieldKey: string | null };

export const PHONE_ERRORS = ['phoneTiers', 'phoneField'] as const;

/** What is wrong with the phone number as it is edited, by the setting it is shown under. */
export type PhoneErrors = Partial<Record<(typeof PHONE_ERRORS)[number], string>>;

export const phoneFormStateOf = (
  setting: StripeCheckoutPhoneSetting | undefined,
): PhoneFormState => ({
  ...collectFormStateOf(setting),
  fieldKey: setting?.collect ? setting.custom_field_key : null,
});

/** What is missing before the phone number can be saved, by error key. */
export function validatePhone(state: PhoneFormState): PhoneErrors {
  if (!state.collect) {
    return {};
  }
  return {
    ...(asksNoTier(state) ? { phoneTiers: 'Choose at least one tier' } : {}),
    ...(state.fieldKey ? {} : { phoneField: 'Choose a field' }),
  };
}

/** The setting to save. Only called once validatePhone finds nothing missing. */
export function phoneSettingOf(state: PhoneFormState): StripeCheckoutPhoneSetting {
  if (!state.collect) {
    return { collect: false };
  }
  if (!state.fieldKey) {
    throw new Error('The phone number was saved without the field it lands in');
  }
  return { collect: true, ...tierIdsSettingOf(state), custom_field_key: state.fieldKey };
}

/** The phone number as it's being edited, for Preview in Stripe, saved or not. */
export function previewPhoneOf(state: PhoneFormState): StripeCheckoutPreviewPhone {
  if (!state.collect || asksNoTier(state)) {
    return { collect: false };
  }
  return { collect: true, ...tierIdsSettingOf(state) };
}
