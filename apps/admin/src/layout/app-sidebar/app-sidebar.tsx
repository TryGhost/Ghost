import React from 'react';

import { Sidebar } from '@tryghost/shade/components';

import AppSidebarHeader from './app-sidebar-header';
import AppSidebarFooter from './app-sidebar-footer';
import AppSidebarContent from './app-sidebar-content';

function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar data-testid="admin-sidebar" {...props}>
      <AppSidebarHeader className="px-5 pt-5 pb-0" />
      <AppSidebarContent />
      <AppSidebarFooter className="gap-0 p-3" />
    </Sidebar>
  );
}

// Shell saving and animation bookkeeping do not change the sidebar's content.
// Its own query/context subscriptions still update navigation and user details.
export default React.memo(AppSidebar);
