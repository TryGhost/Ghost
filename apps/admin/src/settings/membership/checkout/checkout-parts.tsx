import type React from 'react';
import type { CheckoutPartSettings, CollectedPart } from '@tryghost/checkout';
import type { MemberCustomField } from '@tryghost/admin-x-framework/api/member-custom-fields';
import type { StripeCheckoutPartSetting } from '@tryghost/admin-x-framework/api/stripe-checkout-config';
import type { Tier } from '@tryghost/admin-x-framework/api/tiers';
import type { ErrorMessages } from '@tryghost/admin-x-framework/hooks';
import PhoneSettings from './phone-settings';
import ShippingSettings from './shipping-settings';
import TaxNumberSettings from './tax-number-settings';
import { collectFormStateOf, collectSettingOf } from './collect-form';
import {
  PHONE_ERRORS,
  type PhoneFormState,
  phoneFormStateOf,
  phoneSettingOf,
  validatePhone,
} from './phone-form';
import {
  SHIPPING_ERRORS,
  type ShippingFormState,
  shippingFormStateOf,
  shippingSettingOf,
  validateShipping,
} from './shipping-form';
import { TAX_NUMBER_ERRORS, type TaxNumberFormState, validateTaxNumber } from './tax-number-form';

/** Each part checkout can ask the buyer for, as the Fields tab edits it. */
export type PartFormStates = {
  shipping: ShippingFormState;
  phone: PhoneFormState;
  tax_number: TaxNumberFormState;
};

/** The error keys each part's checks give, which its row shows them under. */
type PartErrorKeys = {
  shipping: (typeof SHIPPING_ERRORS)[number];
  phone: (typeof PHONE_ERRORS)[number];
  tax_number: (typeof TAX_NUMBER_ERRORS)[number];
};

/** What a part's row in the Fields tab is given. */
export interface PartSettingsProps<State> {
  state: State;
  /** Paid tiers, archived ones included. */
  tiers: Tier[];
  fields: MemberCustomField[];
  /** The fields chosen for every collected value, which no other value is offered. */
  chosenFields: Array<string | null>;
  errors: ErrorMessages;
  /** Whether every checkout asks for the part, whatever its setting says. */
  alwaysAsked: boolean;
  onChange: (next: State) => void;
}

/** What the Fields tab does with a part: how it edits, checks and saves it. */
interface PartDefinition<Part extends CollectedPart> {
  formStateOf: (setting: StripeCheckoutPartSetting<Part> | undefined) => PartFormStates[Part];
  /** What is missing before the part can be saved, by error key. */
  validate: (state: PartFormStates[Part]) => Partial<Record<PartErrorKeys[Part], string>>;
  /** Every error key `validate` gives, cleared whenever the part changes. */
  errorKeys: ReadonlyArray<PartErrorKeys[Part]>;
  /** The setting to save or preview. Only called once `validate` finds nothing missing. */
  settingOf: (state: PartFormStates[Part]) => StripeCheckoutPartSetting<Part>;
  /** The custom fields the part saves into, which no other part is offered. */
  fieldsOf: (state: PartFormStates[Part]) => Array<string | null>;
  /** Whether every checkout asks for the part, whatever its setting says. */
  alwaysAsked?: (context: { automaticTax: boolean }) => boolean;
  Settings: React.FC<PartSettingsProps<PartFormStates[Part]>>;
}

/** Every part checkout can ask the buyer for, by its name in the Admin API. */
export const CHECKOUT_PARTS: { [Part in CollectedPart]: PartDefinition<Part> } = {
  shipping: {
    formStateOf: shippingFormStateOf,
    validate: validateShipping,
    errorKeys: SHIPPING_ERRORS,
    settingOf: shippingSettingOf,
    fieldsOf: (state) => [state.addressFieldKey, state.nameFieldKey],
    Settings: ShippingSettings,
  },
  phone: {
    formStateOf: phoneFormStateOf,
    validate: validatePhone,
    errorKeys: PHONE_ERRORS,
    settingOf: phoneSettingOf,
    fieldsOf: (state) => [state.fieldKey],
    Settings: PhoneSettings,
  },
  tax_number: {
    formStateOf: collectFormStateOf,
    validate: validateTaxNumber,
    errorKeys: TAX_NUMBER_ERRORS,
    settingOf: collectSettingOf,
    // Stripe keeps the tax ID, so it saves into no field.
    fieldsOf: () => [],
    alwaysAsked: ({ automaticTax }) => automaticTax,
    Settings: TaxNumberSettings,
  },
};

/** Every part as the Fields tab edits it, from what Ghost says is saved. */
export function partFormStatesOf(saved: Partial<CheckoutPartSettings>): PartFormStates {
  const stateOf = <Part extends CollectedPart>(part: Part) =>
    CHECKOUT_PARTS[part].formStateOf(saved[part]);
  return {
    shipping: stateOf('shipping'),
    phone: stateOf('phone'),
    tax_number: stateOf('tax_number'),
  };
}

/** Every part's state, with this part's replaced. */
export function withPartState<Part extends CollectedPart>(
  states: PartFormStates,
  part: Part,
  next: PartFormStates[Part],
): PartFormStates {
  const updated = { ...states };
  updated[part] = next;
  return updated;
}

/** What is missing before these parts can be saved, by error key. */
export function partErrorsOf(states: PartFormStates, parts: CollectedPart[]): ErrorMessages {
  const errorsOf = <Part extends CollectedPart>(part: Part) =>
    CHECKOUT_PARTS[part].validate(states[part]);
  return parts.reduce<ErrorMessages>((errors, part) => ({ ...errors, ...errorsOf(part) }), {});
}

/** The settings to save or preview for these parts. */
export function partSettingsOf(
  states: PartFormStates,
  parts: CollectedPart[],
): Partial<CheckoutPartSettings> {
  const settings: Partial<CheckoutPartSettings> = {};
  const add = <Part extends CollectedPart>(part: Part) => {
    settings[part] = CHECKOUT_PARTS[part].settingOf(states[part]);
  };
  parts.forEach(add);
  return settings;
}

/** The custom fields these parts save into. */
export function partFieldsOf(states: PartFormStates, parts: CollectedPart[]): Array<string | null> {
  const fieldsOf = <Part extends CollectedPart>(part: Part) =>
    CHECKOUT_PARTS[part].fieldsOf(states[part]);
  return parts.flatMap(fieldsOf);
}
