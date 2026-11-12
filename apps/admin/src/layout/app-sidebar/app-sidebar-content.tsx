import { SidebarContent } from '@tryghost/shade/components';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { cn } from '@tryghost/shade/utils';
import { Stack } from '@tryghost/shade/primitives';

import NavMain from './nav-main';
import NavContent from './nav-content';
import NavApps from './nav-apps';
import NavGhostPro from './nav-ghost-pro';
import NavSettings from './nav-settings';
import { ADMIN7_NAV_ICON_CLASS_NAME } from './nav-icon-class';

interface AppSidebarContentProps {
  /** Uses the floating sidebar's own horizontal padding. */
  floating?: boolean;
}

function AppSidebarContent({ floating = false }: AppSidebarContentProps) {
  // Admin 7 lists Ghost(Pro) with Settings, and moves Feedback and Help to
  // the account menu.
  const admin7Design = useFeatureFlag('admin7Design');
  // Eyebrows separate the groups with Apps on, so they sit closer together
  const groupGap = useFeatureFlag('apps') ? 'sidebar:gap-2' : 'sidebar:gap-4';

  return (
    <SidebarContent
      className={cn(
        admin7Design ? 'min-h-16' : 'justify-between',
        // Menu rows line up with the capsule's site icon (its body has the side
        // padding), the first close under its header row. It scrolls out to the
        // capsule's edges, where the scrolling content is clipped.
        floating
          ? '-mx-5 px-5 pt-0 pb-1 [&_[data-sidebar=group]]:px-0 [&>div:first-child>[data-sidebar=group]:first-child]:pt-0'
          : 'px-3 pt-4 pb-1',
        admin7Design && ADMIN7_NAV_ICON_CLASS_NAME,
      )}
    >
      <Stack
        className={cn(
          !admin7Design && groupGap,
          admin7Design &&
            '[&>[data-sidebar=group]+[data-sidebar=group]]:border-t [&>[data-sidebar=group]+[data-sidebar=group]]:border-border-default [&>[data-sidebar=group]+[data-sidebar=group]]:pt-4',
        )}
        gap="sm"
      >
        <NavMain />
        <NavContent />
        <NavApps />
        {!admin7Design && <NavGhostPro />}
        {admin7Design && (
          <NavSettings className="pb-0 not-has-[[data-sidebar=menu-item]]:hidden" admin7Design />
        )}
      </Stack>
      {!admin7Design && (
        <Stack className={groupGap} gap="sm">
          <NavSettings className="pb-0" />
        </Stack>
      )}
    </SidebarContent>
  );
}

export default AppSidebarContent;
