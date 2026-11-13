import React from 'react';

import { Sidebar } from '@tryghost/shade/components';
import { cn } from '@tryghost/shade/utils';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';

import AppSidebarBanner from './app-sidebar-banner';
import AppSidebarHeader from './app-sidebar-header';
import AppSidebarFooter from './app-sidebar-footer';
import AppSidebarContent from './app-sidebar-content';
import { useSidebarBannerState } from './hooks/use-sidebar-banner-state';

const AppSidebar = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof Sidebar>>(
  function AppSidebar({ ...props }, ref) {
    const { hasBanner } = useSidebarBannerState();
    const admin7Design = useFeatureFlag('admin7Design');

    return (
      <Sidebar ref={ref} data-testid="admin-sidebar" {...props}>
        <AppSidebarHeader className="px-5 pt-5 pb-0" />
        <AppSidebarContent />
        {/* Equal gaps between the banner and the Help and account rows' hover states */}
        <AppSidebarBanner
          className={cn('px-3 pt-2', admin7Design && 'min-h-0 shrink overflow-y-auto')}
        />
        <AppSidebarFooter
          className={cn('gap-0 p-3', hasBanner && 'pt-0', admin7Design && 'shrink-0')}
        />
      </Sidebar>
    );
  },
);

export default AppSidebar;
