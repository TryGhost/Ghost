import DesignSidebar from './design-and-branding/design-sidebar';
import ThemeVariantPicker from './design-and-branding/theme-variant-picker';
import { useThemeVariants } from './design-and-branding/use-theme-variants';
import React, { useEffect } from 'react';
import ThemePicker from './design-and-branding/theme-picker';
import ThemePreviewStatus from './design-and-branding/theme-preview-status';
import { ActivateThemeDialog, ActivateThemeErrors } from './design-and-branding/activate-theme';
import { useActivatePreviewTheme } from './design-and-branding/use-activate-preview-theme';
import { useCanCustomizeSite } from '@/view-site/customize';
import ThemePreview from './design-and-branding/theme-preview';
import useQueryParams from '@/settings/hooks/use-query-params';
import {
  PreviewChrome,
  Tabs,
  TabsList,
  TabsTrigger,
  ToggleGroup,
  ToggleGroupItem,
} from '@tryghost/shade/components';
import { DirtyConfirmDialog, useDirtyConfirmation } from '@tryghost/shade/patterns';
import { LucideIcon, useGlobalDirtyState } from '@tryghost/shade/utils';
import { getThemeDisplayName } from './design-and-branding/theme-names';
import { getThemesReturnRoute } from './theme/use-themes-navigation';
import { useThemePreview } from './design-and-branding/use-theme-preview';
import { PreviewModalContent } from '@/settings/components/preview-modal';
import { getHomepageUrl } from '@tryghost/admin-x-framework/api/site';
import { useLocation, useNavigate, useSearchParams } from '@tryghost/admin-x-framework';
import { useBrowsePosts } from '@tryghost/admin-x-framework/api/posts';
import { useDesignForm } from './design-and-branding/use-design-form';
import { useGlobalData } from '@/settings/providers/global-data-context';
import { useSettingsNavigation } from '@/settings/hooks/use-settings-navigation';

const DesignModal: React.FC = () => {
  const { siteData } = useGlobalData();
  const { data: { posts: [latestPost] } = { posts: [] } } = useBrowsePosts({
    searchParams: {
      filter: 'status:published',
      order: 'published_at DESC',
      limit: '1',
      fields: 'id,url',
    },
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const routeState: unknown = location.state;
  const selectedPreviewTab =
    searchParams.get('preview') === 'post' && latestPost ? 'post' : 'homepage';
  const previewDevice = searchParams.get('device') === 'mobile' ? 'mobile' : 'desktop';
  const { updateRoute } = useSettingsNavigation();
  const navigate = useNavigate();

  const refParam = useQueryParams().getParam('ref');

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
  const canCustomizeSite = useCanCustomizeSite();

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
    editsDirty,
    formDirty,
    themeSettingsLoading,
    themeSettingsError,
    retryThemeSettings,
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
  // The previewed theme can't be shown: its settings or its preview token didn't load
  const previewUnavailable = Boolean(previewTheme) && (themeSettingsError || previewTokenError);
  const previewLoading =
    !previewUnavailable &&
    (resolving || (Boolean(previewTheme) && (themeSettingsLoading || !previewToken)));
  const { confirm: confirmLeave, dialogProps: leaveDialogProps } = useDirtyConfirmation();
  const { setGlobalDirtyState } = useGlobalDirtyState();

  // Leaving while only previewing another theme (nothing edited) loses just the
  // preview: the confirmation says so, rather than speak of unsaved changes
  const leavingPreviewOnly = Boolean(previewTheme) && !editsDirty;
  const leaveTitle =
    leavingPreviewOnly && previewTheme
      ? `Leave the preview of ${getThemeDisplayName(previewTheme)}?`
      : undefined;
  const leaveDescription =
    leavingPreviewOnly && activeTheme
      ? `Your site keeps ${getThemeDisplayName(activeTheme)}.`
      : undefined;

  // ⌘S saves, but while previewing there's nothing to save and it mustn't activate:
  // it does nothing, rather than open the browser's Save page
  useEffect(() => {
    if (!previewTheme) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [previewTheme]);

  // Themes is another modal: going there leaves unsaved changes (and preview tweaks) behind
  const handleBrowseThemes = () => {
    confirmLeave(dirty, () => {
      setGlobalDirtyState(false);
      updateRoute('design/change-theme?from=design');
    });
  };

  const activation = useActivatePreviewTheme({
    previewTheme,
    activeTheme,
    activatePreviewTheme,
    holdPreviewTheme,
    onActivated: () => setPreviewTheme(null),
  });

  // The previewed theme full-window, in View site's Customize panel: in this tab,
  // so unsaved changes are asked about first rather than left behind
  const handleViewPreview = () => {
    if (!previewTheme) {
      return;
    }
    // The theme goes along; only edits would be left behind
    confirmLeave(editsDirty, () => {
      setGlobalDirtyState(false);
      navigate(`/site?customize&tab=theme&theme=${encodeURIComponent(previewTheme.name)}`);
    });
  };

  const onSelectURL = (id: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('preview', id);
    setSearchParams(params, { replace: true, state: routeState });
  };

  // One preview per tab, all mounted up front, so switching needs no refetch.
  const previewTargets = [
    { id: 'homepage', url: getHomepageUrl(siteData) },
    ...(latestPost ? [{ id: 'post', url: latestPost.url }] : []),
  ];

  const rawPreviewContent = (
    <div className="relative size-full">
      {previewTargets.map(({ id, url }) => (
        <ThemePreview
          key={id}
          isVisible={selectedPreviewTab === id}
          settings={previewSettings}
          url={url}
          onThemeTokenRejected={refreshPreviewToken}
        />
      ))}
      {(previewLoading || previewUnavailable) && (
        <ThemePreviewStatus
          theme={previewTheme}
          unavailable={previewUnavailable}
          onRetry={() => {
            refreshPreviewToken();
            retryThemeSettings();
          }}
        />
      )}
    </div>
  );
  const previewContent =
    previewDevice === 'desktop' ? (
      <PreviewChrome data-testid="preview-desktop" device="desktop">
        {rawPreviewContent}
      </PreviewChrome>
    ) : (
      <PreviewChrome data-testid="preview-mobile" device="mobile">
        {rawPreviewContent}
      </PreviewChrome>
    );
  const pageTabs = latestPost ? (
    <Tabs value={selectedPreviewTab} variant="button" onValueChange={onSelectURL}>
      <TabsList>
        <TabsTrigger value="homepage">Homepage</TabsTrigger>
        <TabsTrigger value="post">Post</TabsTrigger>
      </TabsList>
    </Tabs>
  ) : undefined;
  // Which installed theme the settings and preview show: the active one, or one to try
  const themePicker =
    themePreviewEnabled && activeTheme ? (
      <ThemePicker
        activeTheme={activeTheme}
        themes={pickableThemes}
        value={previewTheme?.name || activeTheme.name}
        onBrowseThemes={handleBrowseThemes}
        onChange={(name) => setPreviewTheme(name)}
      />
    ) : undefined;
  const deviceSelector = (
    <ToggleGroup
      size="default"
      type="single"
      value={previewDevice}
      onValueChange={(value) => {
        if (value === 'desktop' || value === 'mobile') {
          const params = new URLSearchParams(searchParams);
          if (value === 'mobile') {
            params.set('device', 'mobile');
          } else {
            params.delete('device');
          }
          setSearchParams(params, { replace: true, state: routeState });
        }
      }}
    >
      <ToggleGroupItem aria-label="Desktop" value="desktop">
        <LucideIcon.Laptop />
      </ToggleGroupItem>
      <ToggleGroupItem aria-label="Mobile" value="mobile">
        <LucideIcon.Smartphone />
      </ToggleGroupItem>
    </ToggleGroup>
  );
  const sidebarContent = (
    <DesignSidebar
      activeTheme={activeTheme}
      globalSettings={globalSettings}
      previewTheme={previewTheme}
      themePicker={themePicker}
      themeSettingSections={themeSettingSections}
      themeSettingsError={themeSettingsError}
      themeSettingsLoading={themeSettingsLoading}
      themeVariantPicker={themeVariantPicker}
      updateGlobalSetting={updateGlobalSetting}
      updateThemeSetting={updateThemeSetting}
    />
  );
  const previewName = previewTheme ? getThemeDisplayName(previewTheme) : '';
  // While previewing, View site becomes View preview (the theme full-window, in View
  // site's Customize) where that's available; otherwise it opens the live site, and says so
  const viewPreview = Boolean(previewTheme) && canCustomizeSite;
  const siteLinkLabel = viewPreview
    ? 'View preview'
    : previewTheme
      ? 'View live site'
      : 'View site';

  return (
    <>
      {/* Close stays available while a preview gets ready; only Activate waits for it.
          While previewing, ⌘S doesn't save (see above) and OK activates, after asking. */}
      <PreviewModalContent
        buttonsDisabled={okProps.disabled || activation.activating}
        cancelLabel="Close"
        deviceSelector={deviceSelector}
        dirty={dirty}
        dirtyConfirmDescription={leaveDescription}
        dirtyConfirmTitle={leaveTitle}
        enableCMDS={!previewTheme}
        okDisabled={Boolean(previewTheme) && (previewLoading || previewUnavailable)}
        okLabel={previewTheme ? `Activate ${previewName}` : okProps.label || 'Save'}
        okVariant={previewTheme ? 'default' : okProps.variant}
        preview={previewContent}
        previewToolbarTabs={pageTabs}
        sidebar={sidebarContent}
        sidebarPadding={false}
        siteLink={getHomepageUrl(siteData)}
        siteLinkLabel={siteLinkLabel}
        size="full"
        testId="design-modal"
        title="Design"
        onClose={() => {
          if (refParam === 'setup') {
            navigate('/analytics');
          } else {
            // A preview opened from Themes goes back to it
            updateRoute(getThemesReturnRoute(searchParams) ?? 'design');
          }
        }}
        onOk={async () => {
          if (previewTheme) {
            activation.requestActivation();
            return;
          }
          await handleSave({ fakeWhenUnchanged: true });
        }}
        onSiteLinkClick={viewPreview ? handleViewPreview : undefined}
      />
      <ActivateThemeDialog saveOtherChanges={formDirty} {...activation.dialogProps} />
      <ActivateThemeErrors
        fatalErrors={activation.fatalErrors}
        onClose={activation.dismissFatalErrors}
        onRetry={activation.retry}
      />
      <DirtyConfirmDialog {...leaveDialogProps} description={leaveDescription} title={leaveTitle} />
    </>
  );
};

export default DesignModal;
