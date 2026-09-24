// POC: site-level Stripe Checkout customisation (Settings → Tiers → ⚙ next to "Connected
// to Stripe"). Reference only, not production code.
//
// - Design (background, accent, corners, font) is saved as four `stripe_checkout_*` site
//   settings and sent to Stripe as `branding_settings` (server: stripe-api.js).
// - Fields (shipping, phone, tax ID, per tier) are saved through the existing per-tier API
//   `/tiers/:id/checkout_config/`; this modal shows them per field instead of per tier.
// - The preview is an intentional sketch. "Preview in Stripe" opens the real hosted page
//   in a new tab, built from the unsaved draft (POST /tiers/:id/checkout_preview).
//
// Known shortcuts to fix before production:
// - Not behind the stripeCheckoutCollection flag in the UI (button + route).
// - Save writes shipping/phone/tax to every paid tier, using the first collecting tier's
//   countries and destinations for all of them, even when only design changed.
// - Save isn't disabled until the saved configs have loaded.
// - Only the first page of tiers is read; no dirty-state warning on close.
import React, { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Combobox,
  ComboboxContent,
  ComboboxTrigger,
  ComboboxValue,
  Field,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@tryghost/shade/components';
import ColorPickerField from '@/settings/components/color-picker-field';
import { countryName } from '@tryghost/admin-x-framework/utils/countries';
import {
  PORT_FIELD,
  STRIPE_ALLOWED_COUNTRIES,
  STRIPE_PORT,
  type StripePort,
} from '@tryghost/checkout';
import { CustomFieldPicker } from '@/shared/member-custom-fields/custom-field-picker';
import IconToggleGroup from '@/settings/components/icon-toggle-group';
import { Inline, Stack } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { PreviewModalContent } from '@/settings/components/preview-modal';
import {
  type Tier,
  getPaidActiveTiers,
  useBrowseTiers,
} from '@tryghost/admin-x-framework/api/tiers';
import { getSettingValues, useEditSettings } from '@tryghost/admin-x-framework/api/settings';
import { Color } from '@tryghost/color-utils';
import { toast } from 'sonner';
import {
  type TierCheckoutConfig,
  type TierCheckoutConfigInput,
  useBrowseTiersCheckoutConfig,
  useCreateTierCheckoutPreview,
  useEditTierCheckoutConfig,
} from '@tryghost/admin-x-framework/api/tiers-checkout-config';
import {
  type MemberCustomField,
  useBrowseMemberCustomFields,
} from '@tryghost/admin-x-framework/api/member-custom-fields';
import { useGlobalData } from '@/settings/providers/global-data-context';
import { useHandleError } from '@tryghost/admin-x-framework/hooks';
import { useSettingsNavigation } from '@/settings/hooks/use-settings-navigation';

// Fonts Stripe Checkout accepts for `branding_settings.font_family`.
const STRIPE_FONTS: Array<{ name: string; category: 'Sans-serif' | 'Serif' | 'Monospace' }> = [
  { name: 'Be Vietnam Pro', category: 'Sans-serif' },
  { name: 'Bitter', category: 'Serif' },
  { name: 'Chakra Petch', category: 'Sans-serif' },
  { name: 'Hahmlet', category: 'Serif' },
  { name: 'Inconsolata', category: 'Monospace' },
  { name: 'Inter', category: 'Sans-serif' },
  { name: 'Lato', category: 'Sans-serif' },
  { name: 'Lora', category: 'Serif' },
  { name: 'M PLUS 1 Code', category: 'Monospace' },
  { name: 'Montserrat', category: 'Sans-serif' },
  { name: 'Noto Sans', category: 'Sans-serif' },
  { name: 'Noto Serif', category: 'Serif' },
  { name: 'Nunito', category: 'Sans-serif' },
  { name: 'Open Sans', category: 'Sans-serif' },
  { name: 'PT Sans', category: 'Sans-serif' },
  { name: 'PT Serif', category: 'Serif' },
  { name: 'Pridi', category: 'Serif' },
  { name: 'Raleway', category: 'Sans-serif' },
  { name: 'Roboto', category: 'Sans-serif' },
  { name: 'Roboto Slab', category: 'Serif' },
  { name: 'Source Sans Pro', category: 'Sans-serif' },
  { name: 'Titillium Web', category: 'Sans-serif' },
  { name: 'Ubuntu Mono', category: 'Monospace' },
  { name: 'Zen Maru Gothic', category: 'Sans-serif' },
];

// One stylesheet for every Stripe font, from Bunny Fonts like Ghost's own custom fonts.
const STRIPE_FONTS_CSS = `https://fonts.bunny.net/css?family=${STRIPE_FONTS.map(
  (f) => `${f.name.toLowerCase().replace(/ /g, '-')}:400,700`,
).join('|')}`;

const SYSTEM_FONT_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

const FONT_OPTIONS: Array<{ value: string; label: string; style?: React.CSSProperties }> = [
  { value: 'system', label: 'System default' },
  ...STRIPE_FONTS.map((f) => ({
    value: f.name,
    label: f.name,
    style: { fontFamily: `"${f.name}", ${SYSTEM_FONT_STACK}` },
  })),
];

const BORDER_STYLES = [
  // Inputs and buttons take the full style; boxes that hold several rows get a gentler
  // radius, otherwise "pill" turns a multi-line box into an oval.
  { value: 'rounded', radius: '6px', boxRadius: '8px' },
  { value: 'rectangular', radius: '0px', boxRadius: '0px' },
  { value: 'pill', radius: '999px', boxRadius: '16px' },
] as const;
type BorderStyle = (typeof BORDER_STYLES)[number]['value'];

type Collection = { enabled: boolean; tierIds: string[] };

type FieldsState = {
  // Destination keys: which member custom field each collected value is saved into.
  shipping: Collection & {
    countries: 'all' | 'specific';
    allowedCountries: string[];
    addressFieldKey: string | null;
    nameFieldKey: string | null;
  };
  phone: Collection & { fieldKey: string | null };
  taxId: Collection;
};

type BrandingState = {
  // Stripe's `button_color`. null = the site's accent color.
  accentColor: string | null;
  // Stripe's `background_color` (their "Brand" color). null = white.
  backgroundColor: string | null;
  font: string;
  borderStyle: BorderStyle;
};

const SYSTEM_FONT = 'system';

// Where Stripe will ship, same list as the per-tier checkout section.
const COUNTRY_OPTIONS = STRIPE_ALLOWED_COUNTRIES.map((code) => ({
  value: code,
  label: countryName(code),
})).sort((a, b) => a.label.localeCompare(b.label));

/**
 * A setting that belongs to a toggle above it: label left, narrow control right, the
 * way the newsletter Design tab lays out its selects. Full-width toggles read as the
 * parent, these rows as its settings.
 */
const SubRow: React.FC<{
  label: string;
  htmlFor?: string;
  invalid?: boolean;
  children: React.ReactNode;
}> = ({ label, htmlFor, invalid, children }) => (
  <Inline className="w-full" gap="sm" justify="between">
    <FieldLabel className="shrink-0 font-normal" htmlFor={htmlFor}>
      {label}
    </FieldLabel>
    <Field className="max-w-[200px]" data-invalid={invalid || undefined}>
      {children}
    </Field>
  </Inline>
);

const CountriesPicker: React.FC<{ value: string[]; onChange: (codes: string[]) => void }> = ({
  value,
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  return (
    <SubRow label="Countries">
      <Combobox open={open} onOpenChange={setOpen}>
        <ComboboxTrigger aria-label="Select specific countries">
          <ComboboxValue placeholder={!value.length}>
            {value.length ? value.map(countryName).join(', ') : 'Select...'}
          </ComboboxValue>
        </ComboboxTrigger>
        <ComboboxContent>
          <MultiSelectCombobox
            i18n={{ searchPlaceholder: 'Search countries...' }}
            options={COUNTRY_OPTIONS}
            values={value}
            onChange={onChange}
            onClose={() => setOpen(false)}
          />
        </ComboboxContent>
      </Combobox>
    </SubRow>
  );
};

const TierPicker: React.FC<{
  tiers: Tier[];
  value: string[];
  onChange: (ids: string[]) => void;
  invalid?: boolean;
}> = ({ tiers, value, onChange, invalid }) => {
  const [open, setOpen] = useState(false);
  const label =
    value.length === tiers.length
      ? 'All paid tiers'
      : value.length === 0
        ? 'No tiers'
        : tiers
            .filter((t) => value.includes(t.id))
            .map((t) => t.name)
            .join(', ');

  return (
    <Combobox open={open} onOpenChange={setOpen}>
      <ComboboxTrigger aria-invalid={invalid || undefined} aria-label="Collect for">
        <ComboboxValue placeholder={value.length === 0}>{label}</ComboboxValue>
      </ComboboxTrigger>
      <ComboboxContent>
        <MultiSelectCombobox
          i18n={{ searchPlaceholder: 'Search tiers...' }}
          options={tiers.map((t) => ({ value: t.id, label: t.name }))}
          values={value}
          onChange={onChange}
          onClose={() => setOpen(false)}
        />
      </ComboboxContent>
    </Combobox>
  );
};

const CollectRow: React.FC<{
  label: string;
  collection: Collection;
  tiers: Tier[];
  error?: string;
  onChange: (next: Collection) => void;
  children?: React.ReactNode;
}> = ({ label, collection, tiers, error, onChange, children }) => {
  const id = `checkout-collect-${label.toLowerCase().replace(/\W+/g, '-')}`;
  return (
    <div className="flex flex-col gap-3">
      <Field orientation="horizontal">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <Switch
          checked={collection.enabled}
          id={id}
          onCheckedChange={(enabled) => onChange({ ...collection, enabled })}
        />
      </Field>
      {collection.enabled && (
        <>
          <SubRow invalid={Boolean(error)} label="Collect for">
            <TierPicker
              invalid={Boolean(error)}
              tiers={tiers}
              value={collection.tierIds}
              onChange={(tierIds) => onChange({ ...collection, tierIds })}
            />
            {error && <FieldError>{error}</FieldError>}
          </SubRow>
          {children}
        </>
      )}
    </div>
  );
};

/**
 * Where a value Stripe collects ends up on the member. Which field types may hold it is
 * the shared port table's rule (@tryghost/checkout), same as the per-tier checkout
 * section. Left empty, the server saves into a default field it creates when missing.
 */
const DestinationField: React.FC<{
  port: StripePort;
  label: string;
  allFields: MemberCustomField[];
  value: string | null;
  onChange: (key: string) => void;
}> = ({ port, label, allFields, value, onChange }) => {
  const wants = PORT_FIELD[port];
  const id = `checkout-destination-${port}`;
  return (
    <SubRow htmlFor={id} label={label}>
      <CustomFieldPicker
        createTypes={[wants.type]}
        fields={allFields.filter((f) => f.status === 'active' && f.type === wants.type)}
        id={id}
        label={label}
        value={value}
        onChange={onChange}
      />
    </SubRow>
  );
};

const FieldsTab: React.FC<{
  tiers: Tier[];
  allFields: MemberCustomField[];
  state: FieldsState;
  setState: React.Dispatch<React.SetStateAction<FieldsState>>;
}> = ({ tiers, allFields, state, setState }) => {
  const shippingRow = (
    <CollectRow
      collection={state.shipping}
      label="Shipping address"
      tiers={tiers}
      onChange={(next) => setState((s) => ({ ...s, shipping: { ...s.shipping, ...next } }))}
    >
      <SubRow label="Ships to">
        <Select
          value={state.shipping.countries}
          onValueChange={(countries) =>
            setState((s) => ({
              ...s,
              shipping: { ...s.shipping, countries: countries as 'all' | 'specific' },
            }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All countries</SelectItem>
            <SelectItem value="specific">Specific countries</SelectItem>
          </SelectContent>
        </Select>
      </SubRow>
      {state.shipping.countries === 'specific' && (
        <CountriesPicker
          value={state.shipping.allowedCountries}
          onChange={(codes) =>
            setState((s) => ({ ...s, shipping: { ...s.shipping, allowedCountries: codes } }))
          }
        />
      )}
      <DestinationField
        allFields={allFields}
        label="Save address as"
        port={STRIPE_PORT.shippingAddress}
        value={state.shipping.addressFieldKey}
        onChange={(key) =>
          setState((s) => ({ ...s, shipping: { ...s.shipping, addressFieldKey: key } }))
        }
      />
      <DestinationField
        allFields={allFields}
        label="Save name as"
        port={STRIPE_PORT.shippingName}
        value={state.shipping.nameFieldKey}
        onChange={(key) =>
          setState((s) => ({ ...s, shipping: { ...s.shipping, nameFieldKey: key } }))
        }
      />
    </CollectRow>
  );

  return (
    <div className="flex flex-col">
      <FieldSet className="mt-8">
        <FieldGroup>
          <Stack gap="lg">
            {shippingRow}
            <CollectRow
              collection={state.phone}
              label="Phone"
              tiers={tiers}
              onChange={(next) => setState((s) => ({ ...s, phone: { ...s.phone, ...next } }))}
            >
              <DestinationField
                allFields={allFields}
                label="Save phone as"
                port={STRIPE_PORT.phone}
                value={state.phone.fieldKey}
                onChange={(key) =>
                  setState((s) => ({ ...s, phone: { ...s.phone, fieldKey: key } }))
                }
              />
            </CollectRow>
            <CollectRow
              collection={state.taxId}
              label="Tax ID or VAT"
              tiers={tiers}
              onChange={(taxId) => setState((s) => ({ ...s, taxId }))}
            />
          </Stack>
        </FieldGroup>
      </FieldSet>

      {/*
        Custom fields are deliberately not offered at checkout.

        Checkout is the most fragile moment in a member's journey: every extra question
        costs conversions. Letting publishers add their own questions here would need a
        lot of added complexity to work well for everyone (Stripe's limits of 3 short-text
        questions, per-tier rules, how answers map to member fields, layout), and none of
        it makes paying easier. Leaving it out protects publishers from putting friction
        in front of the one step that earns them money.

        Information that isn't needed to take the payment belongs somewhere else. That's
        planned: on-site forms, and collecting it through the Signup portal later.

        Shipping address, phone and tax ID stay because they are part of completing the
        purchase itself. Questions already saved on a tier are left untouched: this modal
        doesn't send custom_fields, so saving here never removes them.
      */}
    </div>
  );
};

const BrandingTab: React.FC<{
  state: BrandingState;
  setState: React.Dispatch<React.SetStateAction<BrandingState>>;
  accentColor: string;
}> = ({ state, setState, accentColor }) => {
  const set = <K extends keyof BrandingState>(key: K, value: BrandingState[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  return (
    <FieldSet className="mt-8">
      <FieldGroup>
        <div className="mb-1">
          <ColorPickerField
            direction="rtl"
            eyedropper={true}
            swatches={[{ value: null, title: 'White', hex: '#ffffff' }]}
            title="Background color"
            value={state.backgroundColor}
            onChange={(color) => set('backgroundColor', color)}
          />
        </div>
        <div className="mb-1">
          <ColorPickerField
            direction="rtl"
            eyedropper={true}
            swatches={[{ value: null, title: 'Accent', hex: accentColor }]}
            title="Accent color"
            value={state.accentColor}
            onChange={(color) => set('accentColor', color)}
          />
        </div>

        <Inline className="w-full" gap="sm" justify="between">
          <div>Corners</div>
          <IconToggleGroup
            label="Corners"
            options={[
              {
                value: 'rectangular',
                label: 'Squared',
                icon: <LucideIcon.Square className="size-3.5!" />,
              },
              {
                value: 'rounded',
                label: 'Rounded',
                icon: <LucideIcon.Squircle className="size-3.5!" />,
              },
              { value: 'pill', label: 'Pill', icon: <LucideIcon.Circle className="size-3.5!" /> },
            ]}
            value={state.borderStyle}
            onValueChange={(v) => set('borderStyle', v as BorderStyle)}
          />
        </Inline>
        <Inline className="w-full" gap="sm" justify="between">
          <div className="shrink-0">Checkout font</div>
          <Field className="max-w-[200px]">
            <FieldLabel className="sr-only">Checkout font</FieldLabel>
            <link href={STRIPE_FONTS_CSS} rel="stylesheet" />
            <Select value={state.font} onValueChange={(v) => set('font', v)}>
              <SelectTrigger aria-label="Checkout font">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {/* Each option is set in its own font, like the newsletter font selects. */}
                {FONT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span style={option.style}>{option.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </Inline>
      </FieldGroup>
    </FieldSet>
  );
};

type ResolvedBranding = {
  buttonColor: string;
  backgroundColor: string;
  font: string;
  radius: string;
  boxRadius: string;
  displayName: string;
};

// Which tiers a field shows up for. `null` means not collected anywhere, so not previewed.
type Audience = string | null;

// Stripe picks near-black or white text by whichever contrasts more with the color
// (WCAG ratio). Ghost's textColorForBackgroundColor uses a different cut-off and
// flips to white earlier on mid-tones, so it doesn't match what Stripe renders.
const legibleTextOn = (background: string) => {
  const bg = Color(background);
  return bg.contrast(Color('#000000')) >= bg.contrast(Color('#ffffff')) ? '#1a1a1a' : '#ffffff';
};

/**
 * The preview is a sketch on purpose, like the Signup portal card: it shows what the
 * publisher controls (which fields, for which tiers, colors, corners, font) and draws
 * everything Stripe owns as grey shapes. Nobody mistakes it for the real page, so it
 * can't "not match" Stripe; "Preview" opens the real one.
 */
const Bar: React.FC<{ className: string; radius?: string }> = ({ className, radius }) => (
  // currentColor, so bars follow the text color of whatever side they sit on.
  <div
    className={`bg-current opacity-15 ${className}`}
    style={{ borderRadius: radius ?? '999px' }}
  />
);

// Which tiers a field is limited to, in Shade's yellow badge so it pops on the sketch.
const TierTag: React.FC<{ audience?: Audience }> = ({ audience }) =>
  audience ? (
    <Badge className="font-sans" size="sm" variant="warning">
      {audience}
    </Badge>
  ) : null;

const SketchField: React.FC<{
  label: string;
  audience?: Audience;
  radius: string;
  rows?: number;
}> = ({ label, audience, radius, rows = 1 }) => (
  <div className="flex flex-col gap-1.5">
    <span className="flex items-center justify-between gap-2 text-[16px] font-semibold text-neutral-900">
      {label}
      <TierTag audience={audience} />
    </span>
    <div
      className="flex flex-col border border-neutral-200 [&>*+*]:border-t [&>*+*]:border-neutral-200"
      style={{ borderRadius: radius }}
    >
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex h-9 items-center px-3 text-neutral-900">
          <Bar className={`h-2 ${index % 2 ? 'w-1/3' : 'w-1/2'}`} />
        </div>
      ))}
    </div>
  </div>
);

const CheckoutPreview: React.FC<{
  branding: ResolvedBranding;
  collects: {
    shipping: Audience;
    phone: Audience;
    taxId: Audience;
  };
}> = ({ branding, collects }) => {
  const fontFamily =
    branding.font === 'system' ? SYSTEM_FONT_STACK : `"${branding.font}", ${SYSTEM_FONT_STACK}`;
  const summaryText = legibleTextOn(branding.backgroundColor);

  const sheet = (
    <div
      className={`flex min-h-[600px] w-full max-w-[820px] overflow-hidden rounded-xl bg-white shadow-xl`}
      style={{ fontFamily }}
    >
      <link href={STRIPE_FONTS_CSS} rel="stylesheet" />
      {/* Summary: what's being bought. Stripe fills it in; the sketch only shows the brand. */}
      <div
        className={`flex w-1/2 shrink-0 flex-col gap-6 p-8`}
        style={{ backgroundColor: branding.backgroundColor, color: summaryText }}
      >
        <div className="flex items-center gap-2">
          {/* Always a placeholder: Ghost doesn't send an icon or logo to Stripe, so the
              real page shows whatever is set in the Stripe dashboard. */}
          <div className="size-8 rounded-full bg-current opacity-25" />
          <span className="text-[19px] font-bold">{branding.displayName}</span>
        </div>
        <div aria-hidden="true" className="flex flex-col gap-3">
          <Bar className="h-2 w-16" />
          <Bar className="h-6 w-32" />
        </div>
      </div>

      {/* Form: only what the publisher chose to ask, plus Stripe's own parts as shapes. */}
      <div className="flex w-1/2 grow flex-col gap-4 p-8 text-neutral-900">
        <SketchField label="Email" radius={branding.radius} />
        {collects.shipping !== null && (
          <SketchField
            audience={collects.shipping}
            label="Shipping address"
            radius={branding.boxRadius}
            rows={3}
          />
        )}
        {collects.phone !== null && (
          <SketchField audience={collects.phone} label="Phone" radius={branding.radius} />
        )}
        {collects.taxId !== null && (
          <span className="flex items-center gap-2 text-[16px] text-neutral-700">
            <span className="size-4 rounded-sm border-2 border-neutral-300" />
            {/* Stripe's own copy for the tax ID checkbox. */}
            I&apos;m purchasing as a business
            <TierTag audience={collects.taxId} />
          </span>
        )}
        <div className="flex flex-col gap-1.5">
          <span className="text-[16px] font-semibold text-neutral-900">Payment method</span>
          <div
            aria-hidden="true"
            className="flex flex-col gap-3 border border-neutral-200 p-3"
            style={{ borderRadius: branding.boxRadius }}
          >
            {/* Card row: a card icon, the number, and the brand marks. */}
            <div className="flex items-center gap-2">
              <div className="h-4 w-6 rounded-sm bg-current opacity-15" />
              <Bar className="h-2 w-1/3" />
              <div className="ml-auto flex gap-1">
                {[0, 1, 2].map((mark) => (
                  <div key={mark} className="h-3.5 w-5 rounded-xs bg-current opacity-10" />
                ))}
              </div>
            </div>
            {/* Expiry and CVC. */}
            <div className="grid grid-cols-2 gap-2">
              {[0, 1].map((cell) => (
                <div
                  key={cell}
                  className="flex h-9 items-center border border-neutral-200 px-3"
                  style={{ borderRadius: branding.radius }}
                >
                  <Bar className="h-2 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* The pay button: just the accent color and corners. */}
        <div
          className="h-10"
          style={{ backgroundColor: branding.buttonColor, borderRadius: branding.radius }}
        />
      </div>
    </div>
  );

  return (
    <div className="flex size-full items-center justify-center overflow-y-auto p-8">{sheet}</div>
  );
};

const EMPTY_FIELDS: FieldsState = {
  shipping: {
    enabled: false,
    tierIds: [],
    countries: 'all',
    allowedCountries: [],
    addressFieldKey: null,
    nameFieldKey: null,
  },
  phone: { enabled: false, tierIds: [], fieldKey: null },
  taxId: { enabled: false, tierIds: [] },
};

/**
 * Storage stays per tier (the existing /tiers/:id/checkout_config/ API). This modal
 * shows it per field instead: each collection lists the tiers that have it on. Options
 * that are one value per tier (countries, destinations) are read from the first tier
 * that collects, and written to every tier that collects.
 */
const fieldsFromConfigs = (configs: TierCheckoutConfig[], paidTierIds: string[]): FieldsState => {
  const byTier = configs.filter((c) => paidTierIds.includes(c.tier_id));
  const withShipping = byTier.filter((c) => c.shipping);
  const withPhone = byTier.filter((c) => c.phone);
  const firstShipping = withShipping[0]?.shipping;
  return {
    shipping: {
      enabled: withShipping.length > 0,
      tierIds: withShipping.map((c) => c.tier_id),
      countries: firstShipping?.allowed_countries?.length ? 'specific' : 'all',
      allowedCountries: firstShipping?.allowed_countries ?? [],
      addressFieldKey: firstShipping?.address.custom_field_key ?? null,
      nameFieldKey: firstShipping?.name.custom_field_key ?? null,
    },
    phone: {
      enabled: withPhone.length > 0,
      tierIds: withPhone.map((c) => c.tier_id),
      fieldKey: withPhone[0]?.phone?.custom_field_key ?? null,
    },
    taxId: {
      enabled: byTier.some((c) => c.tax_number),
      tierIds: byTier.filter((c) => c.tax_number).map((c) => c.tier_id),
    },
  };
};

// Leaves `custom_fields` out on purpose: the API keeps any block a write doesn't name,
// so questions already saved on a tier survive saving here.
const configForTier = (tierId: string, fields: FieldsState): TierCheckoutConfigInput => {
  const has = (c: Collection) => c.enabled && c.tierIds.includes(tierId);
  // Same fallback as the tier modal: no pick means the port's default field, which the
  // server creates when it is missing.
  const destination = (port: StripePort, chosen: string | null) => chosen ?? PORT_FIELD[port].key;
  return {
    shipping: has(fields.shipping)
      ? {
          collect: true,
          ...(fields.shipping.countries === 'specific'
            ? { allowed_countries: fields.shipping.allowedCountries }
            : {}),
          name: {
            custom_field_key: destination(STRIPE_PORT.shippingName, fields.shipping.nameFieldKey),
          },
          address: {
            custom_field_key: destination(
              STRIPE_PORT.shippingAddress,
              fields.shipping.addressFieldKey,
            ),
          },
        }
      : { collect: false },
    phone: has(fields.phone)
      ? {
          collect: true,
          custom_field_key: destination(STRIPE_PORT.phone, fields.phone.fieldKey),
        }
      : { collect: false },
    tax_number: { collect: has(fields.taxId) },
  };
};

const CheckoutModal: React.FC = () => {
  const { updateRoute } = useSettingsNavigation();
  const { settings } = useGlobalData();
  const handleError = useHandleError();
  const { data: { tiers: allTiers } = {} } = useBrowseTiers();
  const { data: realCustomFields } = useBrowseMemberCustomFields();

  const tiers = useMemo(
    () =>
      [...getPaidActiveTiers(allTiers || [])].sort(
        (a, b) => (a.monthly_price ?? 0) - (b.monthly_price ?? 0),
      ),
    [allTiers],
  );
  const tierIds = tiers.map((t) => t.id);

  const allFields = realCustomFields ?? [];

  const [accentColor, title] = getSettingValues<string>(settings, ['accent_color', 'title']);

  const [sidebarTab, setSidebarTab] = useState<'fields' | 'design'>('design');
  const [fields, setFields] = useState<FieldsState>(EMPTY_FIELDS);
  const { data: checkoutConfigData } = useBrowseTiersCheckoutConfig();
  const { mutateAsync: editTierCheckoutConfig } = useEditTierCheckoutConfig();
  const savedConfigs = useMemo(
    () => checkoutConfigData?.tiers_checkout_config ?? [],
    [checkoutConfigData],
  );
  const [loadedFromServer, setLoadedFromServer] = useState(false);
  const [saving, setSaving] = useState(false);

  // Seed the form once, when both the tiers and their saved configs have arrived.
  useEffect(() => {
    if (!loadedFromServer && checkoutConfigData && tiers.length) {
      setFields(
        fieldsFromConfigs(
          savedConfigs,
          tiers.map((t) => t.id),
        ),
      );
      setLoadedFromServer(true);
    }
  }, [loadedFromServer, checkoutConfigData, savedConfigs, tiers]);

  const saveFields = async () => {
    if (
      fields.shipping.enabled &&
      fields.shipping.countries === 'specific' &&
      !fields.shipping.allowedCountries.length
    ) {
      toast.error('Choose at least one country to ship to');
      return;
    }
    setSaving(true);
    try {
      for (const tier of tiers) {
        await editTierCheckoutConfig({
          tierId: tier.id,
          config: configForTier(tier.id, fields),
        });
      }
      if (backendSupportsDesign) {
        await editSettings([
          { key: 'stripe_checkout_accent_color', value: branding.accentColor ?? '' },
          { key: 'stripe_checkout_background_color', value: branding.backgroundColor ?? '' },
          {
            key: 'stripe_checkout_font',
            value: branding.font === SYSTEM_FONT ? '' : branding.font,
          },
          { key: 'stripe_checkout_border_style', value: branding.borderStyle },
        ]);
      }
      toast.success('Checkout saved');
    } catch (error) {
      handleError(error);
    } finally {
      setSaving(false);
    }
  };
  // POC: stored as site settings; the server sends them to Stripe as branding_settings.
  const [savedBackground, savedAccent, savedFont, savedBorderStyle] = getSettingValues<string>(
    settings,
    [
      'stripe_checkout_background_color',
      'stripe_checkout_accent_color',
      'stripe_checkout_font',
      'stripe_checkout_border_style',
    ],
  );
  // Admin and Core deploy separately: only save design where Core knows the settings.
  const backendSupportsDesign = settings.some((st) => st.key === 'stripe_checkout_font');
  const [branding, setBranding] = useState<BrandingState>({
    accentColor: savedAccent || null,
    backgroundColor: savedBackground || null,
    font: savedFont || SYSTEM_FONT,
    borderStyle: (savedBorderStyle as BorderStyle) || 'rounded',
  });
  const { mutateAsync: editSettings } = useEditSettings();

  // A row switched on starts as "all paid tiers", the common case.
  const withDefaults = <T extends Collection>(next: T, prev: Collection | undefined): T =>
    next.enabled && !prev?.enabled && next.tierIds.length === 0 ? { ...next, tierIds } : next;
  const setFieldsWithDefaults: React.Dispatch<React.SetStateAction<FieldsState>> = (update) =>
    setFields((prev) => {
      const next = typeof update === 'function' ? update(prev) : update;
      return {
        shipping: withDefaults(next.shipping, prev.shipping),
        phone: withDefaults(next.phone, prev.phone),
        taxId: withDefaults(next.taxId, prev.taxId),
      };
    });

  // The preview shows every field that's collected for any tier, tagged when it's
  // limited to some of them. Tiers are chosen in "Collect for", nowhere else.
  const audienceOf = (c: Collection | undefined): Audience => {
    const selected = tiers.filter((t) => c?.enabled && c.tierIds.includes(t.id));
    if (!selected.length) {
      return null;
    }
    return selected.length === tiers.length ? '' : selected.map((t) => t.name).join(', ');
  };

  const siteAccent = accentColor || '#15171A';
  const borderStyle =
    BORDER_STYLES.find((st) => st.value === branding.borderStyle) ?? BORDER_STYLES[0];
  const resolvedBranding: ResolvedBranding = {
    buttonColor: branding.accentColor ?? siteAccent,
    backgroundColor: branding.backgroundColor ?? '#ffffff',
    font: branding.font,
    radius: borderStyle.radius,
    boxRadius: borderStyle.boxRadius,
    displayName: title || 'Your publication',
  };

  // "Preview": the sketch is for choosing; this opens Stripe's real hosted checkout for a
  // tier, built from the UNSAVED draft (fields + design) through the same session builder
  // as a live signup. It can't be framed (Stripe refuses to run in an iframe), so it opens
  // in a new tab.
  const [openingStripe, setOpeningStripe] = useState(false);
  const { mutateAsync: createPreview } = useCreateTierCheckoutPreview();
  const draftBranding: Record<string, string> = {
    button_color: resolvedBranding.buttonColor,
    ...(branding.backgroundColor ? { background_color: branding.backgroundColor } : {}),
    ...(branding.font !== SYSTEM_FONT
      ? { font_family: branding.font.toLowerCase().replace(/ /g, '_') }
      : {}),
    border_style: branding.borderStyle,
  };

  const openStripePreview = async (tier: Tier) => {
    // Open the tab inside the click so the browser doesn't treat it as a popup.
    const tab = window.open('about:blank', '_blank');
    setOpeningStripe(true);
    try {
      const response = await createPreview({
        tierId: tier.id,
        // Plus the tier's saved questions, so the real preview matches what members get.
        config: {
          ...configForTier(tier.id, fields),
          custom_fields:
            savedConfigs
              .find((c) => c.tier_id === tier.id)
              ?.custom_fields.map(({ key, label, optional }) => ({ key, label, optional })) ?? [],
        },
        branding: draftBranding,
        cadence: tier.monthly_price ? 'month' : 'year',
      });
      const { url } = response.tiers_checkout_preview[0];
      if (tab) {
        tab.location.href = url;
      } else {
        window.open(url, '_blank');
      }
    } catch (error) {
      tab?.close();
      handleError(error);
    } finally {
      setOpeningStripe(false);
    }
  };

  const sketchPreview = (
    <CheckoutPreview
      branding={resolvedBranding}
      collects={{
        shipping: audienceOf(fields.shipping),
        phone: audienceOf(fields.phone),
        taxId: audienceOf(fields.taxId),
      }}
    />
  );

  const sidebar = (
    <div className="pt-4">
      <Tabs
        value={sidebarTab}
        variant="underline"
        onValueChange={(v) => setSidebarTab(v as 'fields' | 'design')}
      >
        <TabsList>
          <TabsTrigger value="design">Design</TabsTrigger>
          <TabsTrigger value="fields">Fields</TabsTrigger>
        </TabsList>
        <TabsContent value="fields">
          <FieldsTab
            allFields={allFields}
            setState={setFieldsWithDefaults}
            state={fields}
            tiers={tiers}
          />
        </TabsContent>
        <TabsContent value="design">
          <BrandingTab accentColor={siteAccent} setState={setBranding} state={branding} />
        </TabsContent>
      </Tabs>
    </div>
  );

  return (
    <PreviewModalContent
      buttonsDisabled={saving}
      cancelLabel="Close"
      okLabel={saving ? 'Saving…' : 'Save'}
      preview={sketchPreview}
      previewBgColor="greygradient"
      sidebar={sidebar}
      siteLinkLabel={openingStripe ? 'Opening…' : 'Preview in Stripe'}
      siteLinkMenu={tiers.map((tier) => ({
        label: tier.name,
        onSelect: () => {
          if (!openingStripe) {
            void openStripePreview(tier);
          }
        },
      }))}
      testId="checkout-modal"
      title="Checkout"
      onClose={() => updateRoute('tiers')}
      onOk={saveFields}
    />
  );
};

export default CheckoutModal;
