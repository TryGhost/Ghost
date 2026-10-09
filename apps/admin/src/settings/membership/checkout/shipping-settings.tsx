import React, { useState } from 'react';
import {
  Combobox,
  ComboboxContent,
  ComboboxTrigger,
  ComboboxValue,
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
  MultiSelectCombobox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@tryghost/shade/components';
import { CustomFieldPicker } from '@/shared/member-custom-fields/custom-field-picker';
import { Stack } from '@tryghost/shade/primitives';
import { PORT_FIELD, STRIPE_ALLOWED_COUNTRIES, STRIPE_PORT } from '@tryghost/checkout';
import type { ErrorMessages } from '@tryghost/admin-x-framework/hooks';
import type { MemberCustomField } from '@tryghost/admin-x-framework/api/member-custom-fields';
import { type ShippingFormState, tierChoiceOf } from './shipping-form';
import type { Tier } from '@tryghost/admin-x-framework/api/tiers';
import { countryName } from '@tryghost/admin-x-framework/utils/countries';

const COUNTRY_OPTIONS = STRIPE_ALLOWED_COUNTRIES.map((code) => ({
  value: code,
  label: countryName(code),
})).sort((a, b) => a.label.localeCompare(b.label));

/** A setting under the switch: label on the left, a fixed-width control on the right. */
const SubRow: React.FC<{
  label: string;
  htmlFor?: string;
  error?: string;
  children: React.ReactNode;
}> = ({ label, htmlFor, error, children }) => (
  <Field data-invalid={Boolean(error) || undefined} orientation="horizontal">
    <FieldLabel
      className="h-(--control-height) shrink-0 items-center font-normal"
      htmlFor={htmlFor}
    >
      {label}
    </FieldLabel>
    <FieldContent className="w-[200px] flex-none">
      {children}
      {error && <FieldError>{error}</FieldError>}
    </FieldContent>
  </Field>
);

const MultiPicker: React.FC<{
  id?: string;
  label: string;
  searchPlaceholder: string;
  options: Array<{ value: string; label: string }>;
  values: string[];
  /** Shown while nothing is chosen, as a placeholder. */
  empty: string;
  /** Shown instead of the chosen labels, such as when every option is chosen. */
  summary?: string;
  invalid?: boolean;
  onChange: (values: string[]) => void;
}> = ({ id, label, searchPlaceholder, options, values, empty, summary, invalid, onChange }) => {
  const [open, setOpen] = useState(false);
  const chosen = options.filter((option) => values.includes(option.value));
  const shown =
    summary ??
    (chosen.length
      ? chosen.map((option) => option.label).join(', ')
      : // Chosen values the list no longer offers still count.
        values.length
        ? `${values.length} unavailable`
        : empty);
  return (
    <Combobox open={open} onOpenChange={setOpen}>
      <ComboboxTrigger aria-invalid={invalid || undefined} aria-label={label} id={id}>
        <ComboboxValue placeholder={!values.length}>{shown}</ComboboxValue>
      </ComboboxTrigger>
      <ComboboxContent>
        <MultiSelectCombobox
          i18n={{ searchPlaceholder }}
          options={options}
          values={values}
          onChange={onChange}
          onClose={() => setOpen(false)}
        />
      </ComboboxContent>
    </Combobox>
  );
};

const AllOrSpecific: React.FC<{
  id: string;
  all: string;
  specific: string;
  value: 'all' | 'specific';
  onChange: (value: 'all' | 'specific') => void;
}> = ({ id, all, specific, value, onChange }) => (
  <Select
    value={value}
    onValueChange={(next) => onChange(next === 'specific' ? 'specific' : 'all')}
  >
    <SelectTrigger id={id}>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">{all}</SelectItem>
      <SelectItem value="specific">{specific}</SelectItem>
    </SelectContent>
  </Select>
);

const Destination: React.FC<{
  id: string;
  label: string;
  type: MemberCustomField['type'];
  fields: MemberCustomField[];
  value: string | null;
  error?: string;
  onChange: (key: string) => void;
}> = ({ id, label, type, fields, value, error, onChange }) => (
  <SubRow error={error} htmlFor={id} label={label}>
    <CustomFieldPicker
      createTypes={[type]}
      // A field archived after it was chosen stays chosen, so the setting can be saved back.
      fields={fields.filter(
        (field) => field.type === type && (field.status === 'active' || field.key === value),
      )}
      id={id}
      invalid={Boolean(error)}
      label={label}
      value={value}
      onChange={onChange}
    />
  </SubRow>
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
  errors: ErrorMessages;
  onChange: (next: ShippingFormState) => void;
}> = ({ state, tiers, fields, errors, onChange }) => {
  const set = (next: Partial<ShippingFormState>) => onChange({ ...state, ...next });
  const activeTierIds = tiers.filter((tier) => tier.active).map((tier) => tier.id);

  return (
    <FieldSet>
      <FieldGroup>
        <Stack gap="lg">
          <div className="flex flex-col gap-3">
            <Field orientation="horizontal">
              <FieldLabel htmlFor="checkout-collect-shipping">Shipping address</FieldLabel>
              <Switch
                checked={state.collect}
                id="checkout-collect-shipping"
                onCheckedChange={(collect) => set({ collect })}
              />
            </Field>
            {state.collect && (
              <>
                <SubRow error={errors.shippingTiers} label="Collect for">
                  <MultiPicker
                    empty="No tiers"
                    invalid={Boolean(errors.shippingTiers)}
                    label="Collect for"
                    // An archived tier stays listed while it's chosen, so it can be unticked.
                    options={tiers
                      .filter(
                        (tier) =>
                          tier.active || (!state.allTiers && state.tierIds.includes(tier.id)),
                      )
                      .map((tier) => ({
                        value: tier.id,
                        label: tier.active ? tier.name : `${tier.name} (archived)`,
                      }))}
                    searchPlaceholder="Search tiers..."
                    summary={state.allTiers ? 'All paid tiers' : undefined}
                    values={state.allTiers ? activeTierIds : state.tierIds}
                    onChange={(tierIds) => set(tierChoiceOf(tierIds, activeTierIds))}
                  />
                </SubRow>
                <SubRow htmlFor="checkout-shipping-countries" label="Ships to">
                  <AllOrSpecific
                    all="All countries"
                    id="checkout-shipping-countries"
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
                  error={errors.shippingAddressField}
                  fields={fields}
                  id="checkout-shipping-address-field"
                  label="Save address as"
                  type={PORT_FIELD[STRIPE_PORT.shippingAddress].type}
                  value={state.addressFieldKey}
                  onChange={(addressFieldKey) => set({ addressFieldKey })}
                />
                <Destination
                  error={errors.shippingNameField}
                  fields={fields}
                  id="checkout-shipping-name-field"
                  label="Save name as"
                  type={PORT_FIELD[STRIPE_PORT.shippingName].type}
                  value={state.nameFieldKey}
                  onChange={(nameFieldKey) => set({ nameFieldKey })}
                />
              </>
            )}
          </div>
        </Stack>
      </FieldGroup>
    </FieldSet>
  );
};

export default ShippingSettings;
