import { SidebarContent } from '@tryghost/shade/components';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { cn } from '@tryghost/shade/utils';

import AppSidebarBanner from './app-sidebar-banner';
import NavMain from './nav-main';
import NavContent from './nav-content';
import NavGhostPro from './nav-ghost-pro';
import NavSettings from './nav-settings';
import { useSidebarBannerState } from './hooks/use-sidebar-banner-state';

// Inactive items' icons sit a step lighter than their labels; hover restores the full colour
const ADMIN7_NAV_ICON_CLASS_NAME = [
  '[&_[data-sidebar=menu-button][data-active=false]:not(:hover)>svg]:text-gray-900',
  'dark:[&_[data-sidebar=menu-button][data-active=false]:not(:hover)>svg]:text-gray-600',
].join(' ');

interface AppSidebarContentProps {
  /** Laid out for the floating sidebar: its own padding, banners in the flow. */
  floating?: boolean;
}

function AppSidebarContent({ floating = false }: AppSidebarContentProps) {
  const { banner, bannerType } = useSidebarBannerState();
  // Admin 7 lists Ghost(Pro) with Settings, and moves Feedback and Help to
  // the account menu.
  const admin7Design = useFeatureFlag('admin7Design');
  let bannerContainerClassName = '';

  // Room for the banner floating over the sidebar's foot; an inline banner takes its own
  if (floating) {
    bannerContainerClassName = '';
  } else if (bannerType === 'theme-errors') {
    bannerContainerClassName = 'pb-[110px]';
  } else if (bannerType === 'upgrade') {
    bannerContainerClassName = 'pb-[254px]';
  } else if (bannerType === 'whats-new') {
    bannerContainerClassName = 'pb-[180px]';
  }

  return (
    <SidebarContent
      className={cn(
        'justify-between',
        // Menu rows line up with the capsule's site icon (its body has the side padding)
        floating ? 'px-0 pt-3 pb-1 [&_[data-sidebar=group]]:px-0' : 'px-3 pt-4 pb-1',
        admin7Design && ADMIN7_NAV_ICON_CLASS_NAME,
      )}
    >
      <div className="flex flex-col gap-2 sidebar:gap-4">
        <NavMain />
        <NavContent />
        {!admin7Design && <NavGhostPro />}
      </div>
      <div className={`flex flex-col gap-2 sidebar:gap-4 ${bannerContainerClassName}`}>
        <AppSidebarBanner banner={banner} inline={floating} />
        <NavSettings admin7Design={admin7Design} className="pb-0" />
      </div>
    </SidebarContent>
  );
}

export default AppSidebarContent;
