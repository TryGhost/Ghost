import CheckoutPreview from './checkout-preview';
import ColorPickerField from '@/settings/components/color-picker-field';
import IconToggleGroup from '@/settings/components/icon-toggle-group';
import React, { useEffect } from 'react';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@tryghost/shade/components';
import { Inline } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { PreviewModalContent } from '@/settings/components/preview-modal';
import { STRIPE_FONTS_CSS, STRIPE_FONT_OPTIONS, fontFamilyOf } from './stripe-fonts';
import {
  type StripeCheckoutDesign,
  type StripeCheckoutDesignSetting,
  useEditStripeCheckoutConfig,
  useReadStripeCheckoutConfig,
} from '@tryghost/admin-x-framework/api/stripe-checkout-config';
import { getSettingValues } from '@tryghost/admin-x-framework/api/settings';
import { useBrowseCustomThemeSettings } from '@tryghost/admin-x-framework/api/custom-theme-settings';
import { useFeatureFlag, useForm, useHandleError } from '@tryghost/admin-x-framework/hooks';
import { useGlobalData } from '@/settings/providers/global-data-context';
import { useSettingsNavigation } from '@/settings/hooks/use-settings-navigation';

// Stripe's own defaults, from its Customize Checkout page. Customizing starts from these,
// because Ghost can't read the design set in the publisher's Stripe dashboard yet.
const STRIPE_DEFAULT_DESIGN: StripeCheckoutDesign = {
  button_color: '#0074d4',
  background_color: '#ffffff',
  border_style: 'rounded',
  font_family: 'default',
};

type DesignFormState = { customize: boolean; design: StripeCheckoutDesign };

const formStateOf = (setting: StripeCheckoutDesignSetting): DesignFormState =>
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
    : { customize: false, design: STRIPE_DEFAULT_DESIGN };

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
    <FieldSet className="mt-8">
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

const Sidebar: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="pt-4">
    <Tabs defaultValue="design" variant="underline">
      <TabsList>
        <TabsTrigger value="design">Design</TabsTrigger>
      </TabsList>
      <TabsContent value="design">{children}</TabsContent>
    </Tabs>
  </div>
);

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
  displayName: string;
  onClose: () => void;
}> = ({ setting, displayName, onClose }) => {
  const handleError = useHandleError();
  const { mutateAsync: editConfig } = useEditStripeCheckoutConfig();
  const { formState, saveState, updateForm, handleSave, okProps } = useForm<DesignFormState>({
    initialState: formStateOf(setting),
    savingDelay: 500,
    onSave: async ({ customize, design }) => {
      await editConfig({
        design: customize ? { customize: true, ...design } : { customize: false },
      });
    },
    onSaveError: handleError,
  });

  return (
    <PreviewModalContent
      {...modalProps}
      buttonsDisabled={okProps.disabled}
      dirty={saveState === 'unsaved'}
      okLabel={okProps.label || 'Save'}
      okVariant={okProps.variant}
      preview={
        <CheckoutPreview
          design={formState.customize ? formState.design : STRIPE_DEFAULT_DESIGN}
          displayName={displayName}
        />
      }
      sidebar={
        <Sidebar>
          <DesignSettings state={formState} onChange={(next) => updateForm(() => next)} />
        </Sidebar>
      }
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
  const { settings } = useGlobalData();
  const [title] = getSettingValues<string>(settings, ['title']);
  // Stripe shows the business name set in the Stripe dashboard, which Ghost can't read yet.
  const displayName = title || 'Your publication';
  const { data, isError } = useReadStripeCheckoutConfig();
  const setting = data?.checkout_config[0]?.design;
  const close = () => updateRoute('tiers');

  if (!setting) {
    return (
      <PreviewModalContent
        {...modalProps}
        buttonsDisabled={true}
        okLabel="Save"
        preview={
          <CheckoutPreview design={STRIPE_DEFAULT_DESIGN} displayName={displayName} loading />
        }
        sidebar={
          <Sidebar>
            {isError ? (
              <p className="mt-8 text-sm text-destructive">
                Your checkout settings couldn&apos;t be loaded. Close this and try again.
              </p>
            ) : null}
          </Sidebar>
        }
        onClose={close}
      />
    );
  }

  return <CheckoutEditor displayName={displayName} setting={setting} onClose={close} />;
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
