import DesignSidebar from './design-and-branding/design-sidebar';
import ThemeVariantPicker from './design-and-branding/theme-variant-picker';
import { useThemeVariants } from './design-and-branding/use-theme-variants';
import ThemePicker from './design-and-branding/theme-picker';
import ThemePreviewStatus from './design-and-branding/theme-preview-status';
import { ActivateThemeDialog, ActivateThemeErrors } from './design-and-branding/activate-theme';
import { getThemeDisplayName } from './design-and-branding/theme-names';
import { useThemePreview } from './design-and-branding/use-theme-preview';
import { useActivatePreviewTheme } from './design-and-branding/use-activate-preview-theme';
import GlobalDataProvider from '@/settings/providers/global-data-provider';
import { useEffect, useRef, useState } from 'react';
import ThemePreview from './design-and-branding/theme-preview';
import { Button } from '@tryghost/shade/components';
import { DirtyConfirmDialog, PageHeader, useDirtyConfirmation } from '@tryghost/shade/patterns';
import { cn } from '@tryghost/shade/utils';
import { useDesignForm } from './design-and-branding/use-design-form';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard';
import { useNavigate } from '@tryghost/admin-x-framework';

export interface DesignPanelProps {
  /** The site page to preview the design on, over whatever the panel floats above. */
  pageUrl: string;
  /**
   * Reads the page the site underneath is on, where it can be browsed until
   * the preview takes over; the preview then starts there.
   */
  livePageUrl?: () => string | undefined;
  /** The URL search param that keeps the panel open; leaving it closes the panel. */
  openParam: string;
  /** Closes the panel, once any unsaved changes have been confirmed away. */
  onClose: () => void;
  /** Runs once a save has applied the design, with the page previewed. */
  onSaved?: (pageUrl: string) => void;
}

function DesignPanelContent({
  pageUrl: initialPageUrl,
  livePageUrl,
  openParam,
  onClose,
  onSaved,
}: DesignPanelProps) {
  const {
    enabled: themePreviewEnabled,
    pickableThemes,
    activeTheme,
    previewTheme,
    previewToken,
    previewTokenError,
    resolving,
    setPreviewTheme,
    holdPreviewTheme,
    refreshPreviewToken,
  } = useThemePreview();
  const navigate = useNavigate();
  const {
    globalSettings,
    themeSettingSections,
    previewSettings,
    updateGlobalSetting,
    updateThemeSetting,
    dirty,
    okProps,
    handleSave,
    activatePreviewTheme,
    formDirty,
    themeSettingsLoading,
    themeSettingsError,
    retryThemeSettings,
    editsDirty,
    applyThemeSettingValues,
    currentThemeSettings,
  } = useDesignForm({ previewTheme, previewToken, resolving });
  // An official theme's variants (Source: News, Magazine, Newsletter), to start its settings from
  const {
    variants: themeVariants,
    selected: selectedVariant,
    choose: chooseVariant,
  } = useThemeVariants({
    theme: themePreviewEnabled && !resolving ? previewTheme || activeTheme : undefined,
    settings: themeSettingsLoading ? undefined : currentThemeSettings,
    applySettings: applyThemeSettingValues,
  });
  const themeVariantPicker =
    themePreviewEnabled && themeVariants.length && currentThemeSettings ? (
      <ThemeVariantPicker
        selected={selectedVariant}
        variants={themeVariants}
        onChoose={chooseVariant}
      />
    ) : undefined;
  const previewUnavailable = Boolean(previewTheme) && (themeSettingsError || previewTokenError);
  const previewLoading =
    !previewUnavailable &&
    (resolving || (Boolean(previewTheme) && (themeSettingsLoading || !previewToken)));
  const activation = useActivatePreviewTheme({
    previewTheme,
    activeTheme,
    activatePreviewTheme,
    holdPreviewTheme,
    onActivated: () => {
      setPreviewTheme(null);
      // Under the preview, the site catches up with the new theme
      onSaved?.(pageUrl);
    },
  });
  const { confirm, dialogProps } = useDirtyConfirmation();

  // The preview takes over from the first change until the panel closes (a
  // save keeps it, as it now shows the saved design), on the page the site
  // underneath had got to; from there, it's browsed in its own right
  const [previewing, setPreviewing] = useState(false);
  const [pageUrl, setPageUrl] = useState(initialPageUrl);
  // Another theme is previewed from the start: the site underneath is still the active one
  if ((dirty || previewTheme || resolving) && !previewing) {
    setPreviewing(true);
    const livePage = livePageUrl?.();
    if (livePage && livePage !== pageUrl) {
      setPageUrl(livePage);
    }
  }

  // Unsaved changes hold navigations away (e.g. the top bar's Ghost) and in
  // place ones that close the panel (Back, or Customize again), which the
  // guard's own check, by path, lets through
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const guard = useUnsavedChangesGuard({
    when: dirty,
    interceptNavigation: ({ currentLocation, nextLocation }) =>
      dirtyRef.current &&
      currentLocation.pathname === nextLocation.pathname &&
      !new URLSearchParams(nextLocation.search).has(openParam),
  });

  // Leaving while only previewing another theme (nothing edited) loses just the
  // preview: the confirmations say so, rather than speak of unsaved changes
  const leavingPreviewOnly = Boolean(previewTheme) && !editsDirty;
  const leaveTitle =
    leavingPreviewOnly && previewTheme
      ? `Leave the preview of ${getThemeDisplayName(previewTheme)}?`
      : undefined;
  const leaveDescription =
    leavingPreviewOnly && activeTheme
      ? `Your site keeps ${getThemeDisplayName(activeTheme)}.`
      : undefined;

  const close = () =>
    confirm(dirty, () => {
      guard.bypassNextNavigation();
      onClose();
    });

  const save = async () => {
    if (previewTheme) {
      activation.requestActivation();
      return;
    }
    // Saving without changes reports success, but leaves the site as it was
    const changed = dirtyRef.current;
    if ((await handleSave({ fakeWhenUnchanged: true })) && changed) {
      onSaved?.(pageUrl);
    }
  };

  // ⌘S / Ctrl+S saves, as in the Design modal; while previewing another theme
  // there's nothing to save, and it mustn't activate
  const saveRef = useRef(save);
  saveRef.current = previewTheme ? async () => {} : save;
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault();
        void saveRef.current();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const { interceptedNavigation } = guard;

  return (
    <>
      {/* Mounted from the start, so it has loaded by the first change */}
      <div
        aria-hidden={!previewing}
        className={cn(
          'absolute inset-0 transition-opacity duration-200',
          previewing ? 'pointer-events-auto opacity-100' : 'opacity-0',
        )}
        data-testid="design-panel-preview"
      >
        <ThemePreview
          scaled={false}
          settings={previewSettings}
          url={pageUrl}
          onNavigate={setPageUrl}
          onThemeTokenRejected={refreshPreviewToken}
        />
        {(previewLoading || previewUnavailable) && (
          <ThemePreviewStatus
            // Centred in what the panel leaves of the page: it is 400px wide, 12px in
            className="pr-[412px]"
            theme={previewTheme}
            unavailable={previewUnavailable}
            onRetry={() => {
              refreshPreviewToken();
              retryThemeSettings();
            }}
          />
        )}
      </div>
      <aside
        aria-label="Design"
        className="settings-app pointer-events-auto absolute inset-y-3 right-3 z-10 flex w-[400px] flex-col overflow-hidden rounded-xl border border-border-default bg-surface-elevated-2 shadow-lg motion-safe:animate-[view-site-panel-in_320ms_cubic-bezier(0.16,1,0.3,1)]"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 px-7 py-6">
          <h2 className="text-xl font-bold in-data-[admin7-design=true]:font-title">Design</h2>
          <div className="flex items-center gap-2">
            <PageHeader.Action label="Close" type="button" onClick={close}>
              Close
            </PageHeader.Action>
            <Button
              disabled={
                okProps.disabled ||
                activation.activating ||
                (Boolean(previewTheme) && (previewLoading || previewUnavailable))
              }
              type="button"
              variant={previewTheme ? 'default' : okProps.variant}
              onClick={() => void save()}
            >
              {previewTheme
                ? `Activate ${getThemeDisplayName(previewTheme)}`
                : okProps.label || 'Save'}
            </Button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <DesignSidebar
            activeTheme={activeTheme}
            globalSettings={globalSettings}
            previewTheme={previewTheme}
            themePicker={
              themePreviewEnabled && activeTheme ? (
                <ThemePicker
                  activeTheme={activeTheme}
                  themes={pickableThemes}
                  value={previewTheme?.name || activeTheme.name}
                  // Leaving for Themes is held by the unsaved changes guard; Themes comes back here
                  onBrowseThemes={() => navigate('/settings/design/change-theme?from=customize')}
                  onChange={(name) => setPreviewTheme(name)}
                />
              ) : undefined
            }
            themeSettingSections={themeSettingSections}
            themeSettingsError={themeSettingsError}
            themeSettingsLoading={themeSettingsLoading}
            themeVariantPicker={themeVariantPicker}
            updateGlobalSetting={updateGlobalSetting}
            updateThemeSetting={updateThemeSetting}
          />
        </div>
      </aside>
      <ActivateThemeDialog saveOtherChanges={formDirty} {...activation.dialogProps} />
      <ActivateThemeErrors
        fatalErrors={activation.fatalErrors}
        onClose={activation.dismissFatalErrors}
        onRetry={activation.retry}
      />
      <DirtyConfirmDialog {...dialogProps} description={leaveDescription} title={leaveTitle} />
      <DirtyConfirmDialog
        {...guard.dialogProps}
        description={leaveDescription}
        title={leaveTitle}
      />
      <DirtyConfirmDialog
        description={leaveDescription}
        open={interceptedNavigation.isBlocked}
        title={leaveTitle}
        onConfirm={interceptedNavigation.proceed}
        onOpenChange={(open) => {
          if (!open && interceptedNavigation.isBlocked) {
            interceptedNavigation.reset();
          }
        }}
      />
    </>
  );
}

/**
 * The Design settings as a panel of their own, floating over a page of the
 * site (View site's Customize): from the first change, a preview of that page
 * with the unsaved design takes its place. It brings the settings data it
 * needs, so it can be mounted anywhere in the admin; it fills its positioned
 * parent.
 */
export default function DesignPanel(props: DesignPanelProps) {
  return (
    // Lets the pointer through to what it floats over, except where it shows something
    <div className="pointer-events-none absolute inset-0">
      <GlobalDataProvider>
        <DesignPanelContent {...props} />
      </GlobalDataProvider>
    </div>
  );
}
