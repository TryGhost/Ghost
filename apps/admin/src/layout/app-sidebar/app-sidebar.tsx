import React from 'react';

import { Sidebar } from '@tryghost/shade/components';

import AppSidebarBanner from './app-sidebar-banner';
import AppSidebarHeader from './app-sidebar-header';
import AppSidebarFooter from './app-sidebar-footer';
import AppSidebarContent from './app-sidebar-content';

const AppSidebar = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof Sidebar>>(
  function AppSidebar({ ...props }, ref) {
    return (
      <Sidebar ref={ref} data-testid="admin-sidebar" {...props}>
        <AppSidebarHeader className="px-5 pt-5 pb-0" />
        <AppSidebarContent />
        <AppSidebarBanner className="px-5" />
        <AppSidebarFooter className="gap-0 p-3" />
      </Sidebar>
    );
  },
);

export default AppSidebar;
