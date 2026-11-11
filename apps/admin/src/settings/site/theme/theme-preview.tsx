import React, { useState } from 'react';
import SettingsBreadcrumbs from '@/settings/components/settings-breadcrumbs';
import {
  Badge,
  Button,
  Field,
  FieldLabel,
  PreviewChrome,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@tryghost/shade/components';
import { Inline } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { type OfficialTheme, type ThemeVariant } from '@/settings/providers/settings-app-context';
import { PageHeader } from '@tryghost/shade/patterns';
import { type Theme, isDefaultOrLegacyTheme } from '@tryghost/admin-x-framework/api/themes';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';

const hasVariants = (theme: OfficialTheme) => theme.variants && theme.variants.length > 0;

const getAllVariants = (theme: OfficialTheme): ThemeVariant[] => {
  const variants = [
    {
      image: theme.image,
      category: theme.category,
      previewUrl: theme.previewUrl,
    },
  ];

  if (theme.variants && theme.variants.length > 0) {
    variants.push(...theme.variants);
  }

  return variants;
};

const generateVariantOptionValue = (variant: ThemeVariant) => variant.category.toLowerCase();

const ThemePreview: React.FC<{
  selectedTheme?: OfficialTheme;
  isInstalling?: boolean;
  installedTheme?: Theme;
  onBack: () => void;
  onClose: () => void;
  onInstall?: () => void | Promise<void>;
  /** Shows the theme on the site's own content, in the Design settings (installing it first if needed) */
  onPreview?: (variant?: string) => void | Promise<void>;
}> = ({ selectedTheme, isInstalling, installedTheme, onBack, onInstall, onPreview }) => {
  const [previewMode, setPreviewMode] = useState('desktop');
  const [selectedVariant, setSelectedVariant] = useState<string | undefined>(undefined);
  // Only a variant picked on purpose is carried into the Design settings: the
  // default one would otherwise reset a theme's settings just by previewing it
  const [variantChosen, setVariantChosen] = useState(false);
  // With theme previews, the next step after a theme's demo is the site's own content
  const themePreviewEnabled = useFeatureFlag('themePreview');

  if (!selectedTheme) {
    return null;
  }

  let previewUrl = selectedTheme.previewUrl;

  const variantOptions = getAllVariants(selectedTheme).map((variant) => {
    return {
      label: variant.category,
      value: generateVariantOptionValue(variant),
    };
  });

  if (hasVariants(selectedTheme)) {
    if (selectedVariant === undefined) {
      setSelectedVariant(variantOptions[0].value);
    }

    previewUrl =
      getAllVariants(selectedTheme).find(
        (variant) => generateVariantOptionValue(variant) === selectedVariant,
      )?.previewUrl || previewUrl;
  }

  // The theme's state shows once, beside its name; each button names the theme,
  // with the same few verbs used across Admin. A theme that isn't installed is installed first, as a
  // step of its own (the demo stays); Preview and Customize open the Design settings,
  // where activating happens.
  const primaryVerb = installedTheme?.active ? 'Customize' : installedTheme ? 'Preview' : 'Install';
  const primaryLabel = `${primaryVerb} ${selectedTheme.name}`;
  const installedVersion = installedTheme?.package?.version;
  const stateLabel = installedTheme
    ? `${installedTheme.active ? 'Active' : 'Installed'}${installedVersion ? ` · v${installedVersion}` : ''}`
    : null;
  // An installed copy of an official theme (not one Ghost ships) can be brought up to date
  const canUpdate = Boolean(installedTheme) && !isDefaultOrLegacyTheme(selectedTheme);

  let installButtonLabel = `Install ${selectedTheme.name}`;
  if (isDefaultOrLegacyTheme(selectedTheme) && !installedTheme?.active) {
    installButtonLabel = `Activate ${selectedTheme.name}`;
  } else if (installedTheme) {
    installButtonLabel = `Update ${selectedTheme.name}`;
  }

  const handleInstall = () => {
    // The parent component handles all limit checks and confirmation modals
    void onInstall?.();
  };

  const left = (
    <div className="flex items-center gap-2">
      <SettingsBreadcrumbs
        current={selectedTheme.name}
        label={themePreviewEnabled ? 'Themes' : 'Change theme'}
        onBack={onBack}
      />
      {themePreviewEnabled && stateLabel && (
        <Badge
          data-testid="official-theme-state"
          variant={installedTheme?.active ? 'success' : 'secondary'}
        >
          {stateLabel}
        </Badge>
      )}
      {hasVariants(selectedTheme) ? (
        <>
          <span className="hidden md:!visible md:!block">–</span>
          <Field className="w-auto">
            <FieldLabel className="sr-only">Theme variant</FieldLabel>
            <Select
              value={selectedVariant}
              onValueChange={(value) => {
                setSelectedVariant(value);
                setVariantChosen(true);
              }}
            >
              <SelectTrigger
                aria-label="Theme variant"
                className="w-auto border-0 bg-transparent shadow-none"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="min-w-max">
                {variantOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </>
      ) : null}
    </div>
  );

  const right = (
    <div className="flex justify-end gap-8">
      <Inline gap="sm">
        <Button
          aria-label="Desktop preview"
          size="icon"
          type="button"
          variant="ghost"
          onClick={() => setPreviewMode('desktop')}
        >
          <LucideIcon.Laptop
            className={previewMode === 'desktop' ? 'text-foreground' : 'text-muted-foreground'}
          />
        </Button>
        <Button
          aria-label="Mobile preview"
          size="icon"
          type="button"
          variant="ghost"
          onClick={() => setPreviewMode('mobile')}
        >
          <LucideIcon.Smartphone
            className={previewMode === 'mobile' ? 'text-foreground' : 'text-muted-foreground'}
          />
        </Button>
      </Inline>
      {themePreviewEnabled ? (
        <>
          {canUpdate && (
            <Button disabled={isInstalling} type="button" variant="outline" onClick={handleInstall}>
              Update {selectedTheme.name}
            </Button>
          )}
          <Button
            data-testid="official-theme-preview-on-site"
            disabled={isInstalling}
            type="button"
            // A variant picked here comes along, to start the theme's settings from
            onClick={() => void onPreview?.(variantChosen ? selectedVariant : undefined)}
          >
            {isInstalling ? 'Installing...' : primaryLabel}
          </Button>
        </>
      ) : (
        <Button disabled={isInstalling} type="button" onClick={handleInstall}>
          {isInstalling ? 'Installing...' : installButtonLabel}
        </Button>
      )}
    </div>
  );

  return (
    <div className="absolute inset-0 z-[100]">
      <PageHeader
        blurredBackground={false}
        className="z-[100] h-22 min-h-[92px] bg-background p-8"
        sticky={false}
      >
        <PageHeader.Left className="flex-auto">{left}</PageHeader.Left>
        <PageHeader.Actions className="flex-auto justify-end">{right}</PageHeader.Actions>
      </PageHeader>
      <div className="flex h-[calc(100%-92px)] grow flex-col items-center justify-center bg-background">
        {previewMode === 'desktop' ? (
          <PreviewChrome device="desktop">
            <iframe className="size-full" src={previewUrl} title="Theme preview" />
          </PreviewChrome>
        ) : (
          <PreviewChrome device="mobile">
            <iframe className="size-full" src={previewUrl} title="Theme preview" />
          </PreviewChrome>
        )}
      </div>
    </div>
  );
};

export default ThemePreview;
