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
        // The capsule body has 20px padding; the navigation reaches its edges
        // and adds the vision's narrower 12px inset around the menu rows.
        floating ? '-mx-5 px-3 pt-0 pb-6' : 'px-3 pt-4 pb-1',
        admin7Design && '[&_[data-sidebar=group]]:p-0 [&_[data-sidebar=menu-button]]:rounded-sm',
        admin7Design && ADMIN7_NAV_ICON_CLASS_NAME,
      )}
    >
      <Stack className={cn(!admin7Design && groupGap)} gap={admin7Design ? 'xl' : 'sm'}>
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
