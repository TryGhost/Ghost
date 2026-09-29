// POC: site-level Stripe Checkout customisation (Settings → Tiers → ⚙ next to "Connected
// to Stripe"). Reference only, not production code.
//
// - Design (background, accent, corners, font) is saved as four `stripe_checkout_*` site
//   settings and sent to Stripe as `branding_settings` (server: stripe-api.js), only while
//   `stripe_checkout_customize` is on. Off, the controls are hidden, nothing is sent, and
//   the preview shows the design read from the publisher's Stripe dashboard
//   (GET /tiers/checkout_branding).
// - Fields (shipping, phone, tax ID, per tier) are saved through the existing per-tier API
//   `/tiers/:id/checkout_config/`; this modal shows them per field instead of per tier.
// - The preview is an intentional sketch. "Preview in Stripe" opens the real hosted page
//   in a new tab, built from the unsaved draft (POST /tiers/:id/checkout_preview).
//
// Known shortcuts to fix before production:
// - Save writes shipping/phone/tax to every paid tier, using the first collecting tier's
//   countries and destinations for all of them, even when only design changed.
// - Save isn't blocked until the saved configs have loaded: saving before they arrive
//   empties every tier's checkout settings.
// - Only the first page of tiers is read.
import React, { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Combobox,
  ComboboxContent,
  ComboboxTrigger,
  ComboboxValue,
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
  Skeleton,
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
import { useBrowseCustomThemeSettings } from '@tryghost/admin-x-framework/api/custom-theme-settings';
import { Color } from '@tryghost/color-utils';
import {
  type TierCheckoutBranding,
  type TierCheckoutConfig,
  type TierCheckoutConfigInput,
  useBrowseTiersCheckoutConfig,
  useCreateTierCheckoutPreview,
  useEditTierCheckoutConfig,
  useReadTiersCheckoutBranding,
} from '@tryghost/admin-x-framework/api/tiers-checkout-config';
import {
  type MemberCustomField,
  useBrowseMemberCustomFields,
} from '@tryghost/admin-x-framework/api/member-custom-fields';
import { useGlobalData } from '@/settings/providers/global-data-context';
import {
  type ErrorMessages,
  useFeatureFlag,
  useForm,
  useHandleError,
} from '@tryghost/admin-x-framework/hooks';
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
  { name: 'Noto Sans JP', category: 'Sans-serif' },
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

// The sketch is drawn at desktop size and shrunk with `zoom`, which (unlike a transform)
// also shrinks its layout box, so it stays centered with room around it.
const PREVIEW_SCALE = 0.75;

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
  // Stripe's `button_color`.
  accentColor: string;
  // Stripe's `background_color`.
  backgroundColor: string;
  // SYSTEM_FONT, or one of STRIPE_FONTS by name.
  font: string;
  borderStyle: BorderStyle;
};

const SYSTEM_FONT = 'system';

// Stripe's own defaults (its Customize Checkout page), for when the publisher's design
// can't be read: Stripe not connected, no paid tier yet, or still loading.
const STRIPE_DEFAULT_BRANDING: BrandingState = {
  accentColor: '#0074d4',
  backgroundColor: '#ffffff',
  font: SYSTEM_FONT,
  borderStyle: 'rounded',
};

// Stripe's enum spells families in snake case, e.g. "Roboto Slab" → "roboto_slab", and
// calls the system font `default`.
const toStripeFont = (font: string) =>
  font === SYSTEM_FONT ? 'default' : font.toLowerCase().replace(/ /g, '_');

const brandingFromStripe = (stripe: TierCheckoutBranding): BrandingState => ({
  accentColor: stripe.button_color,
  backgroundColor: stripe.background_color,
  font: STRIPE_FONTS.find((f) => toStripeFont(f.name) === stripe.font_family)?.name ?? SYSTEM_FONT,
  borderStyle: stripe.border_style,
});

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
  // Shade's horizontal Field: with a FieldContent inside it aligns to the top, so an error
  // under the control doesn't pull the label down. The label is one control tall
  // (--control-height) so it still lines up with the control.
  <Field data-invalid={invalid || undefined} orientation="horizontal">
    <FieldLabel
      className="h-(--control-height) shrink-0 items-center font-normal"
      htmlFor={htmlFor}
    >
      {label}
    </FieldLabel>
    {/* A fixed column, so every control lines up whatever the label's length. */}
    <FieldContent className="w-[200px] flex-none">{children}</FieldContent>
  </Field>
);

const CountriesPicker: React.FC<{
  value: string[];
  onChange: (codes: string[]) => void;
  error?: string;
}> = ({ value, onChange, error }) => {
  const [open, setOpen] = useState(false);
  return (
    <SubRow invalid={Boolean(error)} label="Countries">
      <Combobox open={open} onOpenChange={setOpen}>
        <ComboboxTrigger
          aria-invalid={Boolean(error) || undefined}
          aria-label="Select specific countries"
        >
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
      {error && <FieldError>{error}</FieldError>}
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
 * section. Saving requires a pick (see onValidate), so checkout never creates fields
 * the publisher didn't choose.
 */
const DestinationField: React.FC<{
  port: StripePort;
  label: string;
  allFields: MemberCustomField[];
  value: string | null;
  onChange: (key: string) => void;
  error?: string;
}> = ({ port, label, allFields, value, onChange, error }) => {
  const wants = PORT_FIELD[port];
  const id = `checkout-destination-${port}`;
  return (
    <SubRow htmlFor={id} invalid={Boolean(error)} label={label}>
      <CustomFieldPicker
        createTypes={[wants.type]}
        fields={allFields.filter((f) => f.status === 'active' && f.type === wants.type)}
        id={id}
        invalid={Boolean(error)}
        label={label}
        value={value}
        onChange={onChange}
      />
      {error && <FieldError>{error}</FieldError>}
    </SubRow>
  );
};

const FieldsTab: React.FC<{
  tiers: Tier[];
  allFields: MemberCustomField[];
  state: FieldsState;
  setState: React.Dispatch<React.SetStateAction<FieldsState>>;
  errors: ErrorMessages;
}> = ({ tiers, allFields, state, setState, errors }) => {
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
          error={errors.shippingCountries}
          value={state.shipping.allowedCountries}
          onChange={(codes) =>
            setState((s) => ({ ...s, shipping: { ...s.shipping, allowedCountries: codes } }))
          }
        />
      )}
      <DestinationField
        allFields={allFields}
        error={errors.shippingAddressField}
        label="Save address as"
        port={STRIPE_PORT.shippingAddress}
        value={state.shipping.addressFieldKey}
        onChange={(key) =>
          setState((s) => ({ ...s, shipping: { ...s.shipping, addressFieldKey: key } }))
        }
      />
      <DestinationField
        allFields={allFields}
        error={errors.shippingNameField}
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
                error={errors.phoneField}
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

/**
 * Off, checkout uses the design from the publisher's Stripe dashboard, which the preview
 * shows. On, the controls appear starting from that same design, and Ghost sends these
 * four values with every checkout instead. The site's accent and white are one click away
 * as swatches, rather than guessed as a starting point. Same shape as the retention
 * offer's enable switch.
 */
const BrandingTab: React.FC<{
  state: BrandingState;
  setState: (next: BrandingState) => void;
  customize: boolean;
  onCustomizeChange: (customize: boolean) => void;
  loadingStripe: boolean;
  accentColor: string;
  /** The active theme's background color, when it has one (Source's `site_background_color`). */
  siteBackground?: string;
}> = ({
  state,
  setState,
  customize,
  onCustomizeChange,
  loadingStripe,
  accentColor,
  siteBackground,
}) => {
  const set = <K extends keyof BrandingState>(key: K, value: BrandingState[K]) =>
    setState({ ...state, [key]: value });
  // The theme's background (unless it is white already), the site's accent, which can work
  // well as a solid summary side, and white.
  const backgroundSwatches = [
    ...(siteBackground && siteBackground.toLowerCase() !== '#ffffff'
      ? [{ value: siteBackground, title: 'Site background', hex: siteBackground }]
      : []),
    { value: accentColor, title: 'Site accent', hex: accentColor },
    { value: '#ffffff', title: 'White', hex: '#ffffff' },
  ];

  return (
    <FieldSet className="mt-8">
      <FieldGroup>
        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor="checkout-customize-design">Customize checkout design</FieldLabel>
            <FieldDescription>
              {/* Same as the tier's free trial description: in a span, the link isn't a
                  direct child, so FieldDescription's underline and hover don't apply. */}
              <span>
                Overrides the{' '}
                <a
                  className="text-green"
                  href="https://dashboard.stripe.com/settings/branding/checkout"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  checkout styling
                </a>{' '}
                set in Stripe
              </span>
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={customize}
            // Switching on starts from Stripe's design, so wait until it has loaded.
            disabled={loadingStripe && !customize}
            id="checkout-customize-design"
            onCheckedChange={onCustomizeChange}
          />
        </Field>
        {customize && (
          <>
            <div className="mb-1">
              <ColorPickerField
                direction="rtl"
                eyedropper={true}
                swatches={backgroundSwatches}
                title="Background color"
                value={state.backgroundColor}
                onChange={(color) => set('backgroundColor', color ?? '#ffffff')}
              />
            </div>
            <div className="mb-1">
              <ColorPickerField
                direction="rtl"
                eyedropper={true}
                swatches={[{ value: accentColor, title: 'Site accent', hex: accentColor }]}
                title="Accent color"
                value={state.accentColor}
                onChange={(color) => set('accentColor', color ?? accentColor)}
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
                  {
                    value: 'pill',
                    label: 'Pill',
                    icon: <LucideIcon.Circle className="size-3.5!" />,
                  },
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
          </>
        )}
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

// Stripe keeps white text on a color until white would fall below 3:1 contrast, then
// switches to near-black. Stripe doesn't document this; the rule fits every color seen on
// its pages (#e5487a, #ff0000, #533afe, #0074d4, #0f3359 white; #00ff9d dark). Picking
// whichever contrasts more (WCAG) got the pink and red wrong.
const legibleTextOn = (background: string) =>
  Color(background).contrast(Color('#ffffff')) >= 3 ? '#ffffff' : '#1a1a1a';

/**
 * The preview is a sketch on purpose, like the Signup portal card: it shows what the
 * publisher controls (which fields, for which tiers, colors, corners, font) and draws
 * Stripe's own parts as an empty form with placeholder text. Not grey bars: those read
 * as a page still loading. "Preview in Stripe" opens the real one.
 */
const Placeholder: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="truncate text-[15px] text-neutral-400">{children}</span>
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
  placeholders: string[];
}> = ({ label, audience, radius, placeholders }) => (
  <div className="flex flex-col gap-1.5">
    <span className="flex items-center justify-between gap-2 text-[16px] font-semibold text-neutral-900">
      {label}
      <TierTag audience={audience} />
    </span>
    <div
      className="flex flex-col border border-neutral-200 [&>*+*]:border-t [&>*+*]:border-neutral-200"
      style={{ borderRadius: radius }}
    >
      {placeholders.map((placeholder) => (
        <div key={placeholder} className="flex h-9 items-center px-3">
          <Placeholder>{placeholder}</Placeholder>
        </div>
      ))}
    </div>
  </div>
);

// A skeleton block on the sketch: Shade's Skeleton as it comes, sized for each part.
const Block: React.FC<{ className: string }> = ({ className }) => (
  <Skeleton className={className} containerClassName="block" />
);

/**
 * The page while Stripe's design is still loading, with no colors, so Stripe's defaults
 * never flash before the real design. Always the same shape (brand, email, card box,
 * button, divider): the saved fields load separately, and following them would make the
 * skeleton change size while it's on screen. It fits the window's 16:10 minimum.
 */
const SketchSkeleton: React.FC = () => {
  const field = (inputHeight: string) => (
    <div className="flex flex-col gap-1.5">
      <Block className="h-6 w-28" />
      <Block className={inputHeight} />
    </div>
  );
  return (
    <div
      aria-busy="true"
      aria-label="Loading your Stripe checkout design"
      className="flex grow overflow-hidden"
    >
      <div className="flex w-1/2 shrink-0 flex-col p-8">
        <Block className="h-8 w-48" />
      </div>
      <div className="relative flex w-1/2 grow flex-col gap-4 bg-white p-8 pb-20 shadow-[15px_0_30px_0_rgba(0,0,0,0.18)]">
        {field('h-[38px]')}
        {field('h-[134px]')}
        <Block className="h-10" />
      </div>
    </div>
  );
};

const CheckoutPreview: React.FC<{
  branding: ResolvedBranding;
  collects: {
    shipping: Audience;
    phone: Audience;
    taxId: Audience;
  };
  loading?: boolean;
}> = ({ branding, collects, loading }) => {
  const fontFamily =
    branding.font === 'system' ? SYSTEM_FONT_STACK : `"${branding.font}", ${SYSTEM_FONT_STACK}`;
  const summaryText = legibleTextOn(branding.backgroundColor);

  const sheet = (
    // A browser window, so the checkout reads as Stripe's own page and not part of the site.
    // At least 16:10 (820 × 512); a taller form grows it, so the pay button is never cut off.
    <div
      className="my-auto flex min-h-[512px] w-full max-w-[820px] shrink-0 flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      style={{ zoom: PREVIEW_SCALE }}
    >
      <link href={STRIPE_FONTS_CSS} rel="stylesheet" />
      {/* Address bar, drawn like the Ghost Explore illustration in Growth settings. */}
      <div className="shrink-0 p-4">
        <div className="flex h-9 items-center gap-2 rounded-full bg-neutral-100 px-4 text-[15px] text-neutral-400">
          <LucideIcon.Lock className="size-4" />
          checkout.stripe.com
        </div>
      </div>
      {loading ? (
        <SketchSkeleton />
      ) : (
        /* overflow-hidden keeps the form's divider shadow off the address bar. */
        <div className="flex grow overflow-hidden" style={{ fontFamily }}>
          {/* Summary: only the brand. What's being bought depends on the tier, and the preview
            covers every tier at once (fields are tagged with the tiers they apply to). */}
          <div
            className="flex w-1/2 shrink-0 flex-col gap-6 p-8"
            style={{ backgroundColor: branding.backgroundColor, color: summaryText }}
          >
            <div className="flex items-center gap-2">
              {/* Always a stand-in: Ghost doesn't send an icon or logo to Stripe, so the
                real page shows whatever is set in the Stripe dashboard. */}
              <div className="flex size-8 items-center justify-center rounded-full border border-current/15">
                <LucideIcon.Store className="size-4 opacity-60" />
              </div>
              <span className="text-[19px] font-bold">{branding.displayName}</span>
            </div>
          </div>

          {/* Form: only what the publisher chose to ask, plus Stripe's own parts as empty fields.
            Extra room under the button so it reads as a page that continues, not a card.
            The shadow is Stripe's own divider (a `::before` on their form panel): only its
            blur reaches the summary, so the halves stay apart even when both are white. */}
          <div className="relative flex w-1/2 grow flex-col gap-4 bg-white p-8 pb-20 text-neutral-900 shadow-[15px_0_30px_0_rgba(0,0,0,0.18)]">
            <SketchField
              label="Email"
              placeholders={['email@example.com']}
              radius={branding.radius}
            />
            {collects.shipping !== null && (
              <SketchField
                audience={collects.shipping}
                label="Shipping address"
                placeholders={['Full name', 'Country or region', 'Address']}
                radius={branding.boxRadius}
              />
            )}
            {collects.phone !== null && (
              <SketchField
                audience={collects.phone}
                label="Phone"
                placeholders={['(201) 555-0123']}
                radius={branding.radius}
              />
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
                <span className="flex items-center gap-2 text-[15px] font-medium">
                  <LucideIcon.CreditCard className="size-4" />
                  Card
                </span>
                {/* Number, then expiry and CVC side by side, grouped like Stripe's card input. */}
                <div
                  className="flex flex-col border border-neutral-200"
                  style={{ borderRadius: branding.boxRadius }}
                >
                  <div className="flex h-9 items-center px-3">
                    <Placeholder>1234 1234 1234 1234</Placeholder>
                  </div>
                  <div className="grid h-9 grid-cols-2 border-t border-neutral-200">
                    <div className="flex items-center px-3">
                      <Placeholder>MM / YY</Placeholder>
                    </div>
                    <div className="flex items-center border-l border-neutral-200 px-3">
                      <Placeholder>CVC</Placeholder>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* The pay button: the accent color and corners, labelled "Pay" like Stripe's own
                preview (the live label depends on the tier, e.g. "Subscribe"). */}
            <div
              className="flex h-10 items-center justify-center text-[16px] font-medium"
              style={{
                backgroundColor: branding.buttonColor,
                borderRadius: branding.radius,
                color: legibleTextOn(branding.buttonColor),
              }}
            >
              Pay
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    // Centered in the whole pane, not only the space under the 80px toolbar: the spacer
    // mirrors the toolbar below the sheet and gives way first when the sheet is tall.
    // Auto margins (not justify-center) so a sheet taller than the pane scrolls, not clips.
    <div className="flex size-full flex-col items-center overflow-y-auto p-8">
      {sheet}
      <div aria-hidden="true" className="h-20" />
    </div>
  );
};

type CheckoutFormState = {
  fields: FieldsState;
  // "Customize checkout design".
  customize: boolean;
  // Ghost's own design: null until customizing starts, unless it was on when saved.
  branding: BrandingState | null;
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
  // No pick falls back to the port's default key. Saving can't reach this (onValidate
  // requires a pick); only "Preview in Stripe" can, and its draft writes nothing.
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
  const siteAccent = accentColor || '#15171A';
  // Themes can define their own background color; Source calls it `site_background_color`.
  // Offered as a swatch when the active theme has one.
  const { data: themeSettingsData } = useBrowseCustomThemeSettings();
  const themeBackgroundSetting = themeSettingsData?.custom_theme_settings.find(
    (s) => s.key === 'site_background_color',
  );
  const siteBackground =
    themeBackgroundSetting?.type === 'color' ? themeBackgroundSetting.value : undefined;

  const [sidebarTab, setSidebarTab] = useState<'fields' | 'design'>('design');
  const { data: checkoutConfigData } = useBrowseTiersCheckoutConfig();
  const { mutateAsync: editTierCheckoutConfig } = useEditTierCheckoutConfig();
  const { mutateAsync: editSettings } = useEditSettings();
  const savedConfigs = useMemo(
    () => checkoutConfigData?.tiers_checkout_config ?? [],
    [checkoutConfigData],
  );

  // POC: stored as site settings; while "Customize checkout design" is on, the server
  // sends them to Stripe as branding_settings.
  const [savedBackground, savedAccent, savedFont, savedBorderStyle] = getSettingValues<string>(
    settings,
    [
      'stripe_checkout_background_color',
      'stripe_checkout_accent_color',
      'stripe_checkout_font',
      'stripe_checkout_border_style',
    ],
  );
  const [savedCustomize] = getSettingValues<boolean>(settings, ['stripe_checkout_customize']);
  // Admin and Core deploy separately: only save design where Core knows the settings.
  const backendSupportsDesign = settings.some((st) => st.key === 'stripe_checkout_customize');

  // The design set in the publisher's Stripe dashboard: shown while customizing is off,
  // and where customizing starts from.
  const { data: stripeBrandingData, isLoading: loadingStripe } = useReadTiersCheckoutBranding();
  const stripeBranding = stripeBrandingData?.tiers_checkout_branding[0];
  const stripeDesign = stripeBranding
    ? brandingFromStripe(stripeBranding)
    : STRIPE_DEFAULT_BRANDING;

  // Everything the modal edits in one form, like the offer and newsletter modals: any edit
  // marks it unsaved, which drives the unsaved-changes prompt and the Save button's states.
  const {
    formState,
    saveState,
    updateForm,
    setFormState,
    handleSave,
    errors,
    clearError,
    okProps,
  } = useForm<CheckoutFormState>({
    initialState: {
      fields: EMPTY_FIELDS,
      customize: savedCustomize === true,
      branding:
        savedCustomize === true
          ? {
              accentColor: savedAccent || STRIPE_DEFAULT_BRANDING.accentColor,
              backgroundColor: savedBackground || STRIPE_DEFAULT_BRANDING.backgroundColor,
              font: savedFont || SYSTEM_FONT,
              borderStyle: (savedBorderStyle as BorderStyle) || 'rounded',
            }
          : null,
    },
    savingDelay: 500,
    onSave: async (state) => {
      for (const tier of tiers) {
        await editTierCheckoutConfig({
          tierId: tier.id,
          config: configForTier(tier.id, state.fields),
        });
      }
      if (backendSupportsDesign) {
        const saved = state.branding ?? stripeDesign;
        // Off keeps the stored design untouched; it isn't sent while off.
        await editSettings([
          { key: 'stripe_checkout_customize', value: state.customize },
          ...(state.customize
            ? [
                { key: 'stripe_checkout_accent_color', value: saved.accentColor },
                { key: 'stripe_checkout_background_color', value: saved.backgroundColor },
                {
                  key: 'stripe_checkout_font',
                  value: saved.font === SYSTEM_FONT ? '' : saved.font,
                },
                { key: 'stripe_checkout_border_style', value: saved.borderStyle },
              ]
            : []),
        ]);
      }
    },
    onSaveError: handleError,
    // Destinations must be picked: no field is created that the publisher didn't choose.
    onValidate: ({ fields: { shipping, phone } }) => {
      const invalid: ErrorMessages = {};
      if (shipping.enabled) {
        if (shipping.countries === 'specific' && !shipping.allowedCountries.length) {
          invalid.shippingCountries = 'Choose at least one country to ship to';
        }
        if (!shipping.addressFieldKey) {
          invalid.shippingAddressField = 'Choose a field';
        }
        if (!shipping.nameFieldKey) {
          invalid.shippingNameField = 'Choose a field';
        }
      }
      if (phone.enabled && !phone.fieldKey) {
        invalid.phoneField = 'Choose a field';
      }
      return invalid;
    },
  });
  const { fields, customize, branding } = formState;

  // Load the saved fields once both the tiers and their configs have arrived. Loading isn't
  // an edit, so it doesn't mark the form unsaved.
  const [loadedFromServer, setLoadedFromServer] = useState(false);
  useEffect(() => {
    if (!loadedFromServer && checkoutConfigData && tiers.length) {
      setFormState((state) => ({
        ...state,
        fields: fieldsFromConfigs(
          savedConfigs,
          tiers.map((t) => t.id),
        ),
      }));
      setLoadedFromServer(true);
    }
  }, [loadedFromServer, checkoutConfigData, savedConfigs, tiers, setFormState]);

  const design = customize ? (branding ?? stripeDesign) : stripeDesign;
  const changeCustomize = (next: boolean) =>
    updateForm((state) => ({
      ...state,
      customize: next,
      branding: next && !state.branding ? stripeDesign : state.branding,
    }));
  const setBranding = (next: BrandingState) =>
    updateForm((state) => ({ ...state, branding: next }));

  // A row switched on starts as "all paid tiers", the common case.
  const withDefaults = <T extends Collection>(next: T, prev: Collection | undefined): T =>
    next.enabled && !prev?.enabled && next.tierIds.length === 0 ? { ...next, tierIds } : next;
  const setFieldsWithDefaults: React.Dispatch<React.SetStateAction<FieldsState>> = (update) => {
    for (const key of [
      'shippingCountries',
      'shippingAddressField',
      'shippingNameField',
      'phoneField',
    ]) {
      clearError(key);
    }
    updateForm((state) => {
      const next = typeof update === 'function' ? update(state.fields) : update;
      return {
        ...state,
        fields: {
          shipping: withDefaults(next.shipping, state.fields.shipping),
          phone: withDefaults(next.phone, state.fields.phone),
          taxId: withDefaults(next.taxId, state.fields.taxId),
        },
      };
    });
  };

  // The preview shows every field that's collected for any tier, tagged when it's
  // limited to some of them. Tiers are chosen in "Collect for", nowhere else.
  const audienceOf = (c: Collection | undefined): Audience => {
    const selected = tiers.filter((t) => c?.enabled && c.tierIds.includes(t.id));
    if (!selected.length) {
      return null;
    }
    return selected.length === tiers.length ? '' : selected.map((t) => t.name).join(', ');
  };

  const borderStyle =
    BORDER_STYLES.find((st) => st.value === design.borderStyle) ?? BORDER_STYLES[0];
  const resolvedBranding: ResolvedBranding = {
    buttonColor: design.accentColor,
    backgroundColor: design.backgroundColor,
    font: design.font,
    radius: borderStyle.radius,
    boxRadius: borderStyle.boxRadius,
    // Stripe's business name, which the real page shows: Ghost doesn't send one. The site
    // title only when Stripe's design can't be read.
    displayName: stripeBranding?.display_name || title || 'Your publication',
  };

  // "Preview": the sketch is for choosing; this opens Stripe's real hosted checkout for a
  // tier, built from the UNSAVED draft (fields + design) through the same session builder
  // as a live signup. It can't be framed (Stripe refuses to run in an iframe), so it opens
  // in a new tab.
  const [openingStripe, setOpeningStripe] = useState(false);
  const { mutateAsync: createPreview } = useCreateTierCheckoutPreview();
  // Off sends nothing, so the real page shows the publisher's own Stripe design.
  const draftBranding: Record<string, string> = customize
    ? {
        button_color: design.accentColor,
        background_color: design.backgroundColor,
        font_family: toStripeFont(design.font),
        border_style: design.borderStyle,
      }
    : {};

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
      // Only Stripe's own design needs loading; customizing draws Ghost's values.
      loading={!customize && loadingStripe}
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
            errors={errors}
            setState={setFieldsWithDefaults}
            state={fields}
            tiers={tiers}
          />
        </TabsContent>
        <TabsContent value="design">
          <BrandingTab
            accentColor={siteAccent}
            customize={customize}
            loadingStripe={loadingStripe}
            setState={setBranding}
            siteBackground={siteBackground}
            state={design}
            onCustomizeChange={changeCustomize}
          />
        </TabsContent>
      </Tabs>
    </div>
  );

  return (
    <PreviewModalContent
      buttonsDisabled={okProps.disabled}
      cancelLabel="Close"
      // Asks before closing, and before leaving Settings, with unsaved changes.
      dirty={saveState === 'unsaved'}
      height={720}
      okLabel={okProps.label || 'Save'}
      okVariant={okProps.variant}
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
      size="lg"
      testId="checkout-modal"
      title="Checkout"
      width={1140}
      onClose={() => updateRoute('tiers')}
      onOk={async () => {
        try {
          // "Saved" even with nothing changed, like the other settings modals.
          const saved = await handleSave({ fakeWhenUnchanged: true });
          if (!saved) {
            // The only check is on the Fields tab; show it there.
            setSidebarTab('fields');
          }
        } catch {
          // Already shown by onSaveError; handleSave re-throws after it.
        }
      }}
    />
  );
};

// The route stays registered, but with the stripeCheckoutCollection flag off it goes
// straight back to Tiers, so the modal is only reachable when the flag is on.
const CheckoutRoute: React.FC = () => {
  const enabled = useFeatureFlag('stripeCheckoutCollection');
  const { updateRoute } = useSettingsNavigation();

  useEffect(() => {
    if (!enabled) {
      updateRoute('tiers');
    }
  }, [enabled, updateRoute]);

  return enabled ? <CheckoutModal /> : null;
};

export default CheckoutRoute;
