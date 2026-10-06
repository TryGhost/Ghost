import { SidebarContent } from '@tryghost/shade/components';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';

import AppSidebarBanner from './app-sidebar-banner';
import NavMain from './nav-main';
import NavContent from './nav-content';
import NavApps from './nav-apps';
import NavGhostPro from './nav-ghost-pro';
import NavSettings from './nav-settings';
import { useSidebarBannerState } from './hooks/use-sidebar-banner-state';

function AppSidebarContent() {
  const { banner, bannerType } = useSidebarBannerState();
  // With Apps on, eyebrow labels separate the groups, so they sit closer together.
  const groupGap = useFeatureFlag('apps') ? 'sidebar:gap-2' : 'sidebar:gap-4';
  let bannerContainerClassName = '';

  if (bannerType === 'theme-errors') {
    bannerContainerClassName = 'pb-[110px]';
  } else if (bannerType === 'upgrade') {
    bannerContainerClassName = 'pb-[254px]';
  } else if (bannerType === 'whats-new') {
    bannerContainerClassName = 'pb-[180px]';
  }

  return (
    <SidebarContent className="justify-between px-3 pt-4 pb-1">
      <div className={`flex flex-col gap-2 ${groupGap}`}>
        <NavMain />
        <NavContent />
        <NavApps />
        <NavGhostPro />
      </div>
      <div className={`flex flex-col gap-2 ${groupGap} ${bannerContainerClassName}`}>
        <AppSidebarBanner banner={banner} />
        <NavSettings className="pb-0" />
      </div>
    </SidebarContent>
  );
}

export default AppSidebarContent;
