import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@tryghost/shade/components';
import { PORT_FIELD, STRIPE_ALLOWED_COUNTRIES, STRIPE_PORT } from '@tryghost/checkout';
import type { MemberCustomField } from '@tryghost/admin-x-framework/api/member-custom-fields';
import type { Tier } from '@tryghost/admin-x-framework/api/tiers';
import { countryName } from '@tryghost/admin-x-framework/utils/countries';
import { CollectRow, Destination, MultiPicker, SubRow } from './collect-settings';
import type { ShippingErrors, ShippingFormState } from './shipping-form';

const COUNTRY_OPTIONS = STRIPE_ALLOWED_COUNTRIES.map((code) => ({
  value: code,
  label: countryName(code),
})).sort((a, b) => a.label.localeCompare(b.label));

const AllOrSpecific: React.FC<{
  label: string;
  all: string;
  specific: string;
  value: 'all' | 'specific';
  onChange: (value: 'all' | 'specific') => void;
}> = ({ label, all, specific, value, onChange }) => (
  <Select
    value={value}
    onValueChange={(next) => onChange(next === 'specific' ? 'specific' : 'all')}
  >
    <SelectTrigger aria-label={label}>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">{all}</SelectItem>
      <SelectItem value="specific">{specific}</SelectItem>
    </SelectContent>
  </Select>
);

/**
 * Collecting a shipping address at checkout: which paid tiers ask for it, where Stripe ships,
 * and the custom fields the address and the recipient's name are saved into. Stripe always
 * asks for the recipient's name with the address, so both need a field.
 */
const ShippingSettings: React.FC<{
  state: ShippingFormState;
  /** Paid tiers, archived ones included. */
  tiers: Tier[];
  fields: MemberCustomField[];
  /** The fields chosen for every collected value, which no other value is offered. */
  chosenFields: Array<string | null>;
  errors: ShippingErrors;
  onChange: (next: ShippingFormState) => void;
}> = ({ state, tiers, fields, chosenFields, errors, onChange }) => {
  const set = (next: Partial<ShippingFormState>) => onChange({ ...state, ...next });

  return (
    <CollectRow
      id="checkout-collect-shipping"
      label="Shipping address"
      state={state}
      tiers={tiers}
      tiersError={errors.shippingTiers}
      onChange={set}
    >
      <SubRow label="Ships to">
        <AllOrSpecific
          all="All countries"
          label="Ships to"
          specific="Specific countries"
          value={state.countries}
          onChange={(countries) => set({ countries })}
        />
      </SubRow>
      {state.countries === 'specific' && (
        <SubRow error={errors.shippingCountries} label="Countries">
          <MultiPicker
            empty="Select..."
            invalid={Boolean(errors.shippingCountries)}
            label="Countries"
            options={COUNTRY_OPTIONS}
            searchPlaceholder="Search countries..."
            values={state.allowedCountries}
            onChange={(allowedCountries) => set({ allowedCountries })}
          />
        </SubRow>
      )}
      <Destination
        chosen={chosenFields}
        error={errors.shippingAddressField}
        fields={fields}
        label="Save address as"
        type={PORT_FIELD[STRIPE_PORT.shippingAddress].type}
        value={state.addressFieldKey}
        onChange={(addressFieldKey) => set({ addressFieldKey })}
      />
      <Destination
        chosen={chosenFields}
        error={errors.shippingNameField}
        fields={fields}
        label="Save name as"
        type={PORT_FIELD[STRIPE_PORT.shippingName].type}
        value={state.nameFieldKey}
        onChange={(nameFieldKey) => set({ nameFieldKey })}
      />
    </CollectRow>
  );
};

export default ShippingSettings;
