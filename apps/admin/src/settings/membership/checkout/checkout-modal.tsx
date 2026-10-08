import CheckoutPreview from './checkout-preview';
import ColorPickerField from '@/settings/components/color-picker-field';
import IconToggleGroup from '@/settings/components/icon-toggle-group';
import React, { useEffect, useState } from 'react';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@tryghost/shade/components';
import { Inline } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { PreviewModalContent } from '@/settings/components/preview-modal';
import { STRIPE_FONTS_CSS, STRIPE_FONT_OPTIONS, fontFamilyOf } from './stripe-fonts';
import {
  type StripeCheckoutBranding,
  type StripeCheckoutDesign,
  type StripeCheckoutDesignSetting,
  useCreateStripeCheckoutPreview,
  useEditStripeCheckoutConfig,
  useReadStripeCheckoutBranding,
  useReadStripeCheckoutConfig,
} from '@tryghost/admin-x-framework/api/stripe-checkout-config';
import {
  type Tier,
  getPaidActiveTiers,
  useBrowseTiers,
} from '@tryghost/admin-x-framework/api/tiers';
import { checkStripeEnabled, getSettingValues } from '@tryghost/admin-x-framework/api/settings';
import { useBrowseCustomThemeSettings } from '@tryghost/admin-x-framework/api/custom-theme-settings';
import { useFeatureFlag, useForm, useHandleError } from '@tryghost/admin-x-framework/hooks';
import { useGlobalData } from '@/settings/providers/global-data-context';
import { toast } from 'sonner';
import { useSettingsNavigation } from '@/settings/hooks/use-settings-navigation';

// Stripe's own defaults, from its Customize Checkout page, for when the design in the Stripe
// dashboard can't be read.
const STRIPE_DEFAULT_DESIGN: StripeCheckoutDesign = {
  button_color: '#0074d4',
  background_color: '#ffffff',
  border_style: 'rounded',
  font_family: 'default',
};

type DesignFormState = { customize: boolean; design: StripeCheckoutDesign };

// Customizing starts from the Stripe dashboard design, so switching it on changes nothing until
// one of the settings does.
const formStateOf = (
  setting: StripeCheckoutDesignSetting,
  dashboardDesign: StripeCheckoutDesign,
): DesignFormState =>
  setting.customize
    ? {
        customize: true,
        design: {
          button_color: setting.button_color,
          background_color: setting.background_color,
          border_style: setting.border_style,
          font_family: setting.font_family,
        },
      }
    : { customize: false, design: dashboardDesign };

const designSettingOf = ({ customize, design }: DesignFormState): StripeCheckoutDesignSetting =>
  customize ? { customize: true, ...design } : { customize: false };

type SketchBranding = Omit<StripeCheckoutBranding, 'design'> & { design: StripeCheckoutDesign };

/**
 * The checkout branding in the Stripe dashboard. Until Stripe is connected, or when Stripe
 * can't be asked, the site title and Stripe's own defaults stand in for it, and the defaults
 * stand in for a design Ghost can't show.
 */
function useStripeBranding(): { branding: SketchBranding; loading: boolean } {
  const { settings, config } = useGlobalData();
  const [title] = getSettingValues<string>(settings, ['title']);
  // No error toast: the stand-in is shown instead, as it is on a Ghost too old to read this.
  const { data, isLoading } = useReadStripeCheckoutBranding({
    enabled: checkStripeEnabled(settings, config),
    defaultErrorHandler: false,
  });

  const read = data?.checkout_branding[0];
  return {
    branding: {
      display_name: read?.display_name ?? (title || 'Your publication'),
      design: read?.design ?? STRIPE_DEFAULT_DESIGN,
    },
    loading: isLoading,
  };
}

/**
 * "Preview in Stripe": one item per active paid tier, each opening a real Stripe Checkout page
 * for that tier in the design being edited, saved or not. Undefined while there is nothing to
 * preview: Stripe isn't connected, or there are no paid tiers.
 */
function useStripePreviewMenu(design: StripeCheckoutDesignSetting) {
  const { settings, config } = useGlobalData();
  const { data: { tiers = [] } = {} } = useBrowseTiers();
  const handleError = useHandleError();
  const { mutateAsync: createPreview } = useCreateStripeCheckoutPreview();
  const [opening, setOpening] = useState(false);

  const paidTiers = [...getPaidActiveTiers(tiers)].sort(
    (a, b) => (a.monthly_price ?? 0) - (b.monthly_price ?? 0),
  );
  if (!checkStripeEnabled(settings, config) || !paidTiers.length) {
    return undefined;
  }

  const open = async (tier: Tier) => {
    // Opened inside the click, so the browser doesn't block it as a popup, and cut off from
    // Admin before Stripe's page loads in it. A blocked tab can't be opened later, after the
    // checkout is created, so the preview stops here.
    const tab = window.open('about:blank', '_blank');
    if (!tab) {
      toast.error(
        'Your browser blocked the preview. Allow pop-ups for Ghost Admin, then try again.',
      );
      return;
    }
    tab.opener = null;
    setOpening(true);
    try {
      const response = await createPreview({
        tier_id: tier.id,
        cadence: tier.monthly_price ? 'month' : 'year',
        design,
      });
      const url = response.checkout_preview[0]?.url;
      if (!url) {
        throw new Error('Stripe returned no checkout to preview');
      }
      tab.location.href = url;
    } catch (error) {
      tab.close();
      handleError(error);
    } finally {
      setOpening(false);
    }
  };

  return {
    label: opening ? 'Opening…' : 'Preview in Stripe',
    items: paidTiers.map((tier) => ({
      key: tier.id,
      label: tier.name,
      onSelect: () => {
        if (!opening) {
          void open(tier);
        }
      },
    })),
  };
}

const DesignSettings: React.FC<{
  state: DesignFormState;
  onChange: (next: DesignFormState) => void;
}> = ({ state, onChange }) => {
  const { settings } = useGlobalData();
  const [accentColor] = getSettingValues<string>(settings, ['accent_color']);
  const siteAccent = accentColor || '#15171a';
  // Themes can define their own background color; Source calls it `site_background_color`.
  const { data: themeSettingsData } = useBrowseCustomThemeSettings();
  const themeBackground = themeSettingsData?.custom_theme_settings.find(
    (setting) => setting.key === 'site_background_color',
  );
  const siteBackground = themeBackground?.type === 'color' ? themeBackground.value : undefined;

  const setDesign = <Key extends keyof StripeCheckoutDesign>(
    key: Key,
    value: StripeCheckoutDesign[Key],
  ) => onChange({ ...state, design: { ...state.design, [key]: value } });

  const backgroundSwatches = [
    ...(siteBackground && siteBackground.toLowerCase() !== '#ffffff'
      ? [{ value: siteBackground, title: 'Site background', hex: siteBackground }]
      : []),
    { value: siteAccent, title: 'Site accent', hex: siteAccent },
    { value: '#ffffff', title: 'White', hex: '#ffffff' },
  ];

  return (
    <FieldSet>
      <FieldGroup>
        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor="checkout-customize-design">Customize checkout design</FieldLabel>
            <FieldDescription>
              {/* In a span, the link isn't a direct child, so FieldDescription's underline and
                  hover styles don't apply to it. */}
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
            checked={state.customize}
            id="checkout-customize-design"
            onCheckedChange={(customize) => onChange({ ...state, customize })}
          />
        </Field>
        {state.customize && (
          <>
            <div className="mb-1">
              <ColorPickerField
                direction="rtl"
                swatches={backgroundSwatches}
                title="Background color"
                value={state.design.background_color}
                onChange={(color) =>
                  setDesign('background_color', color ?? STRIPE_DEFAULT_DESIGN.background_color)
                }
              />
            </div>
            <div className="mb-1">
              <ColorPickerField
                direction="rtl"
                swatches={[{ value: siteAccent, title: 'Site accent', hex: siteAccent }]}
                title="Accent color"
                value={state.design.button_color}
                onChange={(color) =>
                  setDesign('button_color', color ?? STRIPE_DEFAULT_DESIGN.button_color)
                }
              />
            </div>
            <Inline className="w-full" gap="sm" justify="between">
              <span>Corners</span>
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
                value={state.design.border_style}
                onValueChange={(borderStyle) => setDesign('border_style', borderStyle)}
              />
            </Inline>
            <Field className="justify-between" orientation="horizontal">
              <FieldLabel className="font-normal" htmlFor="checkout-font">
                Checkout font
              </FieldLabel>
              <link href={STRIPE_FONTS_CSS} rel="stylesheet" />
              <Select
                value={state.design.font_family}
                onValueChange={(value) => {
                  const font = STRIPE_FONT_OPTIONS.find((option) => option.value === value);
                  if (font) {
                    setDesign('font_family', font.value);
                  }
                }}
              >
                <SelectTrigger className="max-w-[200px]" id="checkout-font">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STRIPE_FONT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span style={{ fontFamily: fontFamilyOf(option.value) }}>{option.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </>
        )}
      </FieldGroup>
    </FieldSet>
  );
};

const modalProps = {
  cancelLabel: 'Close',
  height: 720,
  previewBgColor: 'greygradient',
  size: 'lg',
  title: 'Checkout',
  width: 1140,
} as const;

const CheckoutEditor: React.FC<{
  setting: StripeCheckoutDesignSetting;
  branding: SketchBranding;
  onClose: () => void;
}> = ({ setting, branding, onClose }) => {
  const handleError = useHandleError();
  const { mutateAsync: editConfig } = useEditStripeCheckoutConfig();
  const { formState, saveState, updateForm, handleSave, okProps } = useForm<DesignFormState>({
    initialState: formStateOf(setting, branding.design),
    savingDelay: 500,
    onSave: async (state) => {
      await editConfig({ design: designSettingOf(state) });
    },
    onSaveError: handleError,
  });
  const previewMenu = useStripePreviewMenu(designSettingOf(formState));

  return (
    <PreviewModalContent
      {...modalProps}
      buttonsDisabled={okProps.disabled}
      dirty={saveState === 'unsaved'}
      okLabel={okProps.label || 'Save'}
      okVariant={okProps.variant}
      preview={
        <CheckoutPreview
          design={formState.customize ? formState.design : branding.design}
          displayName={branding.display_name}
        />
      }
      sidebar={<DesignSettings state={formState} onChange={(next) => updateForm(() => next)} />}
      siteLinkMenu={previewMenu}
      onClose={onClose}
      onOk={async () => {
        try {
          await handleSave({ fakeWhenUnchanged: true });
        } catch {
          // Already shown by onSaveError; handleSave re-throws after it.
        }
      }}
    />
  );
};

const CheckoutModal: React.FC = () => {
  const { updateRoute } = useSettingsNavigation();
  const { data, isError } = useReadStripeCheckoutConfig();
  const { branding, loading } = useStripeBranding();
  const setting = data?.checkout_config[0]?.design;
  const close = () => updateRoute('tiers');

  if (!setting || loading) {
    return (
      <PreviewModalContent
        {...modalProps}
        buttonsDisabled={true}
        okLabel="Save"
        preview={
          <CheckoutPreview design={branding.design} displayName={branding.display_name} loading />
        }
        sidebar={
          <div>
            {isError ? (
              <p className="text-sm text-destructive">
                Your checkout settings couldn&apos;t be loaded. Close this and try again.
              </p>
            ) : null}
          </div>
        }
        onClose={close}
      />
    );
  }

  return <CheckoutEditor branding={branding} setting={setting} onClose={close} />;
};

// The route stays registered, but with the stripeCheckoutDesign flag off it goes straight
// back to Tiers, so the modal is only reachable while the flag is on.
const CheckoutRoute: React.FC = () => {
  const enabled = useFeatureFlag('stripeCheckoutDesign');
  const { updateRoute } = useSettingsNavigation();

  useEffect(() => {
    if (!enabled) {
      updateRoute('tiers');
    }
  }, [enabled, updateRoute]);

  return enabled ? <CheckoutModal /> : null;
};

export default CheckoutRoute;
