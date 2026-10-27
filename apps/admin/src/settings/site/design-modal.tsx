import DesignSidebar from './design-and-branding/design-sidebar';
import React, { useState } from 'react';
import ThemePreview from './design-and-branding/theme-preview';
import useQueryParams from '@/settings/hooks/use-query-params';
import { Laptop, Smartphone } from 'lucide-react';
import {
  PreviewChrome,
  Tabs,
  TabsList,
  TabsTrigger,
  ToggleGroup,
  ToggleGroupItem,
} from '@tryghost/shade/components';
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
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const { updateRoute } = useSettingsNavigation();
  const navigate = useNavigate();

  const refParam = useQueryParams().getParam('ref');

  const {
    globalSettings,
    themeSettingSections,
    previewSettings,
    updateGlobalSetting,
    updateThemeSetting,
    dirty,
    okProps,
    handleSave,
  } = useDesignForm();

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
        />
      ))}
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
  const previewTabs = latestPost ? (
    <Tabs value={selectedPreviewTab} variant="button" onValueChange={onSelectURL}>
      <TabsList>
        <TabsTrigger value="homepage">Homepage</TabsTrigger>
        <TabsTrigger value="post">Post</TabsTrigger>
      </TabsList>
    </Tabs>
  ) : undefined;
  const deviceSelector = (
    <ToggleGroup
      size="default"
      type="single"
      value={previewDevice}
      onValueChange={(value) => {
        if (value === 'desktop' || value === 'mobile') {
          setPreviewDevice(value);
        }
      }}
    >
      <ToggleGroupItem aria-label="Desktop" value="desktop">
        <Laptop />
      </ToggleGroupItem>
      <ToggleGroupItem aria-label="Mobile" value="mobile">
        <Smartphone />
      </ToggleGroupItem>
    </ToggleGroup>
  );
  const sidebarContent = (
    <DesignSidebar
      globalSettings={globalSettings}
      themeSettingSections={themeSettingSections}
      updateGlobalSetting={updateGlobalSetting}
      updateThemeSetting={updateThemeSetting}
    />
  );

  return (
    <PreviewModalContent
      buttonsDisabled={okProps.disabled}
      cancelLabel="Close"
      deviceSelector={deviceSelector}
      dirty={dirty}
      okLabel={okProps.label || 'Save'}
      okVariant={okProps.variant}
      preview={previewContent}
      previewToolbarTabs={previewTabs}
      sidebar={sidebarContent}
      sidebarPadding={false}
      siteLink={getHomepageUrl(siteData)}
      size="full"
      testId="design-modal"
      title="Design"
      onClose={() => {
        if (refParam === 'setup') {
          navigate('/analytics');
        } else {
          updateRoute('design');
        }
      }}
      onOk={async () => {
        await handleSave({ fakeWhenUnchanged: true });
      }}
    />
  );
};

export default DesignModal;
