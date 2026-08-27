import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';
import { CustomFieldPicker } from '@/shared/member-custom-fields/custom-field-picker';
import { STRIPE_ALLOWED_COUNTRIES } from './stripe-allowed-countries';
import {
  Combobox,
  ComboboxContent,
  ComboboxTrigger,
  ComboboxValue,
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  MultiSelectCombobox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Switch,
} from '@tryghost/shade/components';
import { type ErrorMessages, useHandleError } from '@tryghost/admin-x-framework/hooks';
import { Text } from '@tryghost/shade/primitives';
import {
  type MemberCustomField,
  useBrowseMemberCustomFields,
} from '@tryghost/admin-x-framework/api/member-custom-fields';
import {
  type TierCheckoutConfig,
  useEditTierCheckoutConfig,
} from '@tryghost/admin-x-framework/api/tiers-checkout-config';
import {
  type ReactNode,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';

countries.registerLocale(enLocale);

// Names for codes ISO 3166-1 does not carry as standalone entries but Stripe ships to.
const EXTRA_COUNTRY_NAMES: Record<string, string> = {
  AC: 'Ascension Island',
  TA: 'Tristan da Cunha',
  ZZ: 'Unknown region',
};

const countryName = (code: string) =>
  EXTRA_COUNTRY_NAMES[code] ?? countries.getName(code, 'en', { select: 'alias' }) ?? code;

const countryOptions = STRIPE_ALLOWED_COUNTRIES.map((code) => ({
  value: code,
  label: countryName(code),
})).sort((a, b) => a.label.localeCompare(b.label));

const SHIPS_TO_OPTIONS = [
  { value: 'all', label: 'All countries', hint: 'Everywhere Stripe supports shipping' },
  { value: 'specific', label: 'Specific countries', hint: 'Choose the countries you deliver to' },
] as const;
type ShipsToMode = (typeof SHIPS_TO_OPTIONS)[number]['value'];

export type TierCheckoutCollectionHandle = {
  /**
   * Check the configuration without persisting anything, painting errors inline. Meant to
   * run alongside the tier form's own validation BEFORE either resource is written, so a
   * refused save never leaves one of the two already committed.
   */
  validate: () => boolean;
  /**
   * Persist the checkout configuration against the given tier — the one being edited, or
   * the one a create just made, which is why the id arrives here rather than as a prop.
   * Resolves true without a request when nothing changed. Resolves false when nothing was
   * saved — invalid input (errors are shown inline) or a failed request (already handed
   * to handleError) — so the caller can stop without an exception escaping the modal's
   * onOk.
   */
  save: (tierId: string) => Promise<boolean>;
};

type TierCheckoutState = {
  shipping: {
    collect: boolean;
    countriesMode: ShipsToMode;
    allowedCountries: string[];
    addressFieldKey: string | null;
    nameFieldKey: string | null;
  };
  // Just a switch: the tax number stays on Stripe, so there is no destination to hold.
  taxNumber: { collect: boolean };
  phone: { collect: boolean; customFieldKey: string | null };
};

/**
 * What the section would actually save, as state. Sub-choices behind a switched-off
 * toggle stay in local state so flipping the toggle back restores them, but they are not
 * part of any write — so they must not count toward dirtiness either, or a save that
 * turned something off would compare its leftovers against a baseline that no longer
 * holds them and read as unsaved forever.
 */
const effectiveState = (current: TierCheckoutState): TierCheckoutState => ({
  shipping: current.shipping.collect
    ? {
        ...current.shipping,
        allowedCountries:
          current.shipping.countriesMode === 'specific' ? current.shipping.allowedCountries : [],
      }
    : {
        collect: false,
        countriesMode: 'all',
        allowedCountries: [],
        addressFieldKey: null,
        nameFieldKey: null,
      },
  taxNumber: current.taxNumber,
  phone: current.phone.collect ? current.phone : { collect: false, customFieldKey: null },
});

const stateFromConfig = (config: TierCheckoutConfig | undefined): TierCheckoutState => {
  const shipping = config?.shipping;
  // Countries are a restriction, so a configuration that names none delivers everywhere.
  const restrictedTo = shipping?.allowed_countries;
  return {
    shipping: {
      collect: Boolean(shipping),
      addressFieldKey: shipping?.address.custom_field_key ?? null,
      nameFieldKey: shipping?.name.custom_field_key ?? null,
      countriesMode: restrictedTo ? 'specific' : 'all',
      allowedCountries: restrictedTo ?? [],
    },
    taxNumber: {
      collect: Boolean(config?.tax_number),
    },
    phone: {
      collect: Boolean(config?.phone),
      customFieldKey: config?.phone?.custom_field_key ?? null,
    },
  };
};

/** The section's one card shell, shared by the configured state and the failed state. */
function CheckoutCard({ children }: { children: ReactNode }) {
  return (
    <FieldSet>
      <FieldLegend>Checkout</FieldLegend>
      <FieldGroup className="mb-10 gap-6 rounded-sm border border-border-default p-4 md:p-7">
        {children}
      </FieldGroup>
    </FieldSet>
  );
}

/** A card row: plain-text label left, a control that prefers 256px but may shrink right. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col content-center gap-4 md:flex-row md:items-center">
      <div className="w-full min-w-[160px] md:flex-1">{label}</div>
      <div className="w-full md:w-64 md:min-w-0">{children}</div>
    </div>
  );
}

function CollectToggle({
  checked,
  description,
  id,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  description: string;
  id: string;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Field orientation="horizontal">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <Switch checked={checked} id={id} onCheckedChange={onCheckedChange} />
      </Field>
      <FieldDescription>{description}</FieldDescription>
    </div>
  );
}

function DestinationRow({
  createTypes,
  error,
  fields,
  id,
  label,
  value,
  onChange,
}: {
  createTypes: MemberCustomField['type'][];
  error: string | undefined;
  fields: MemberCustomField[];
  id: string;
  label: string;
  value: string | null;
  onChange: (key: string) => void;
}) {
  return (
    <Row label={label}>
      <Field data-invalid={Boolean(error) || undefined}>
        <CustomFieldPicker
          createTypes={createTypes}
          fields={fields}
          id={id}
          invalid={Boolean(error)}
          label={label}
          value={value}
          onChange={onChange}
        />
        {error && <FieldError>{error}</FieldError>}
      </Field>
    </Row>
  );
}

const TierCheckoutCollection = forwardRef<
  TierCheckoutCollectionHandle,
  {
    config: TierCheckoutConfig | undefined;
    /**
     * The configuration read failed on a Core that has the endpoint: the card's place is
     * held with an explanation, because an absent section would read as "collection is
     * off" to a publisher who came to check exactly that. The handle no-ops.
     */
    failed?: boolean;
    /** Fires when edits diverge from (or return to) the saved configuration. */
    onDirtyChange?: (dirty: boolean) => void;
  }
>(({ config, failed, onDirtyChange }, ref) => {
  const [state, setState] = useState<TierCheckoutState>(() => stateFromConfig(config));
  const [errors, setErrors] = useState<ErrorMessages>({});
  const [countriesOpen, setCountriesOpen] = useState(false);
  const { mutateAsync: editCheckoutConfig } = useEditTierCheckoutConfig();
  const handleError = useHandleError();

  const { data: fieldsData } = useBrowseMemberCustomFields();
  const allFields = fieldsData?.members_custom_fields ?? [];
  // What each collection may be kept in is the server's rule (PORT_FIELD in
  // tier-checkout-config/destinations.ts): an address goes into an address field, a
  // recipient name or phone number strictly into a short text one. Offering anything
  // wider here would invite a pick the save then refuses.
  const addressFields = allFields.filter((field) => field.type === 'address');
  const shortTextFields = allFields.filter((field) => field.type === 'short_text');

  const selectedCountries = state.shipping.allowedCountries;

  // stateFromConfig builds every object literally and effectiveState rebuilds in that
  // same shape, so key order is stable and stringify comparison is reliable. The mount is
  // keyed by tier id, so `config` describes this state's origin for the whole lifetime —
  // though the baseline recomputes when a save's invalidation refetches it.
  const initialSerialized = useMemo(
    () => JSON.stringify(effectiveState(stateFromConfig(config))),
    [config],
  );
  // A successful write makes the state it saved the baseline immediately, without waiting
  // for a refetch to deliver it back — the create path depends on this, because a mount
  // with no tier id has no config for any refetch to rebase it with.
  const [savedSerialized, setSavedSerialized] = useState<string | null>(null);
  const dirty =
    !failed && JSON.stringify(effectiveState(state)) !== (savedSerialized ?? initialSerialized);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const buildErrors = (): ErrorMessages => {
    const newErrors: ErrorMessages = {};
    // Only what the picker offers can be saved: a chosen key missing from the eligible
    // list means the field was archived or deleted since — the server would refuse it,
    // so it is surfaced here, next to a picker that would otherwise just look empty.
    // Held off while the fields are still loading, when absence proves nothing.
    const destinationError = (key: string | null, eligible: MemberCustomField[]) => {
      if (!key) {
        return 'Choose where this should be kept';
      }
      if (fieldsData && !eligible.some((field) => field.key === key)) {
        return 'This field is no longer available. Choose another';
      }
      return undefined;
    };
    if (state.shipping.collect) {
      newErrors.shippingField = destinationError(state.shipping.addressFieldKey, addressFields);
      newErrors.shippingName = destinationError(state.shipping.nameFieldKey, shortTextFields);
      if (state.shipping.countriesMode === 'specific' && !state.shipping.allowedCountries.length) {
        newErrors.shippingCountries = 'Choose at least one country you deliver to';
      }
    }
    if (state.phone.collect) {
      // Two collections MAY share a destination: writes apply in a fixed order and the
      // last wins, which is the designed behaviour for shared fields — so no distinctness
      // rule here, deliberately.
      newErrors.phoneField = destinationError(state.phone.customFieldKey, shortTextFields);
    }
    return newErrors;
  };

  // The one judgement both handle methods share: paint what buildErrors found and say
  // whether the state may be written. Untouched state passes without judgement — it
  // saved once already, and re-judging it could block the whole tier save on a section
  // the publisher never opened (e.g. a since-archived destination). Problems in stored
  // config surface when it is edited.
  const applyValidation = () => {
    if (!dirty) {
      setErrors({});
      return true;
    }
    const newErrors = buildErrors();
    setErrors(newErrors);
    return !Object.values(newErrors).some(Boolean);
  };

  useImperativeHandle(
    ref,
    () => ({
      validate: applyValidation,
      save: async (tierId: string) => {
        if (!dirty) {
          return true;
        }
        if (!applyValidation()) {
          return false;
        }

        try {
          // Every block is stated so switching one off is written as collect: false
          // rather than left alone by omission.
          await editCheckoutConfig({
            tierId,
            config: {
              shipping: state.shipping.collect
                ? {
                    collect: true,
                    // Everywhere is the absence of a list, never a copy of every country:
                    // that set moves, and a saved enumeration would silently become a
                    // restriction the day the processor adds one.
                    ...(state.shipping.countriesMode === 'specific'
                      ? { allowed_countries: state.shipping.allowedCountries }
                      : {}),
                    name: { custom_field_key: state.shipping.nameFieldKey! },
                    address: { custom_field_key: state.shipping.addressFieldKey! },
                  }
                : { collect: false },
              tax_number: { collect: state.taxNumber.collect },
              phone: state.phone.collect
                ? {
                    collect: true,
                    custom_field_key: state.phone.customFieldKey!,
                  }
                : { collect: false },
            },
          });
          setSavedSerialized(JSON.stringify(effectiveState(state)));
          return true;
        } catch (error) {
          handleError(error);
          return false;
        }
      },
    }),
    // buildErrors and dirty close over render-scope values, so everything they read has
    // to invalidate the handle.
    [dirty, editCheckoutConfig, fieldsData, handleError, state],
  );

  if (failed) {
    return (
      <CheckoutCard>
        <Text className="text-sm text-muted-foreground">
          Checkout collection settings could not be loaded, so they are not shown. Close and reopen
          this tier to try again.
        </Text>
      </CheckoutCard>
    );
  }

  return (
    <CheckoutCard>
      <CollectToggle
        checked={state.shipping.collect}
        description="Require a shipping address during checkout"
        id="tier-collect-shipping"
        label="Collect shipping address"
        onCheckedChange={(checked) =>
          setState((current) => ({
            ...current,
            shipping: { ...current.shipping, collect: checked },
          }))
        }
      />
      {state.shipping.collect && (
        <>
          <Row label="Ships to">
            <Field>
              <FieldLabel className="sr-only">Ships to</FieldLabel>
              <Select
                value={state.shipping.countriesMode}
                onValueChange={(value: ShipsToMode) => {
                  setErrors((current) => ({ ...current, shippingCountries: undefined }));
                  setState((current) => ({
                    ...current,
                    shipping: { ...current.shipping, countriesMode: value },
                  }));
                }}
              >
                <SelectTrigger aria-label="Ships to">
                  <SelectValue>
                    {
                      SHIPS_TO_OPTIONS.find(
                        (option) => option.value === state.shipping.countriesMode,
                      )?.label
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {SHIPS_TO_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="flex flex-col">
                        <span>{option.label}</span>
                        <span className="text-sm text-muted-foreground">{option.hint}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </Row>
          {state.shipping.countriesMode === 'specific' && (
            <Row label="Select specific countries">
              <Field data-invalid={Boolean(errors.shippingCountries) || undefined}>
                <FieldLabel className="sr-only">Select specific countries</FieldLabel>
                <Combobox open={countriesOpen} onOpenChange={setCountriesOpen}>
                  <ComboboxTrigger
                    aria-invalid={Boolean(errors.shippingCountries) || undefined}
                    aria-label="Select specific countries"
                  >
                    <ComboboxValue placeholder={!selectedCountries.length}>
                      {selectedCountries.length
                        ? selectedCountries.map(countryName).join(', ')
                        : 'Select...'}
                    </ComboboxValue>
                  </ComboboxTrigger>
                  <ComboboxContent>
                    <MultiSelectCombobox
                      i18n={{ searchPlaceholder: 'Search countries...' }}
                      options={countryOptions}
                      values={selectedCountries}
                      onChange={(values) => {
                        setErrors((current) => ({ ...current, shippingCountries: undefined }));
                        setState((current) => ({
                          ...current,
                          shipping: { ...current.shipping, allowedCountries: values },
                        }));
                      }}
                      onClose={() => setCountriesOpen(false)}
                    />
                  </ComboboxContent>
                </Combobox>
                {errors.shippingCountries && <FieldError>{errors.shippingCountries}</FieldError>}
              </Field>
            </Row>
          )}
          <DestinationRow
            createTypes={['address']}
            error={errors.shippingField}
            fields={addressFields}
            id="tier-shipping-address-field"
            label="Save address as"
            value={state.shipping.addressFieldKey}
            onChange={(key) => {
              setErrors((current) => ({ ...current, shippingField: undefined }));
              setState((current) => ({
                ...current,
                shipping: { ...current.shipping, addressFieldKey: key },
              }));
            }}
          />
          <DestinationRow
            createTypes={['short_text']}
            error={errors.shippingName}
            fields={shortTextFields}
            id="tier-shipping-name-field"
            label="Save recipient name as"
            value={state.shipping.nameFieldKey}
            onChange={(key) => {
              setErrors((current) => ({ ...current, shippingName: undefined }));
              setState((current) => ({
                ...current,
                shipping: { ...current.shipping, nameFieldKey: key },
              }));
            }}
          />
        </>
      )}

      <Separator />

      <CollectToggle
        checked={state.phone.collect}
        description="Require a phone number during checkout"
        id="tier-collect-phone"
        label="Collect phone number"
        onCheckedChange={(checked) =>
          setState((current) => ({
            ...current,
            phone: { ...current.phone, collect: checked },
          }))
        }
      />
      {state.phone.collect && (
        <DestinationRow
          createTypes={['short_text']}
          error={errors.phoneField}
          fields={shortTextFields}
          id="tier-phone-field"
          label="Save to custom field"
          value={state.phone.customFieldKey}
          onChange={(key) => {
            setErrors((current) => ({ ...current, phoneField: undefined }));
            setState((current) => ({
              ...current,
              phone: { ...current.phone, customFieldKey: key },
            }));
          }}
        />
      )}

      <Separator />

      <CollectToggle
        checked={state.taxNumber.collect}
        description="Let members add a tax ID to their invoices"
        id="tier-collect-tax"
        label="Collect business tax ID"
        onCheckedChange={(checked) =>
          setState((current) => ({
            ...current,
            taxNumber: { ...current.taxNumber, collect: checked },
          }))
        }
      />
    </CheckoutCard>
  );
});

TierCheckoutCollection.displayName = 'TierCheckoutCollection';

export default TierCheckoutCollection;
