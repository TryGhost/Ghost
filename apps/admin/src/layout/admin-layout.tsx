import { ActivityPubHostLayoutProvider } from '@tryghost/activitypub/api';
import { AdminSidebarToggle } from './admin-sidebar-toggle';
import React from 'react';
import { SidebarInset, SidebarProvider } from '@tryghost/shade/components';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { isContributorUser } from '@tryghost/admin-x-framework/api/users';
import { useAdminSidebarVisibility } from '@/layout/sidebar-visibility';
import { useAdminPageChromeClasses } from '@/layout/use-admin-page-chrome-classes';
import {
  AdminSidebarContext,
  AdminSidebarLayoutContext,
  useAdminSidebar,
} from '@/layout/use-admin-sidebar';
import { cn } from '@tryghost/shade/utils';
import AppSidebar from './app-sidebar';
import { MobileNavBar } from './app-sidebar/mobile-nav-bar';
import { ContributorUserMenu } from './app-sidebar/user-menu';

// Stable host slot: sidebar saves must not rerender the Network content tree.
const networkPageChrome = {
  headerLeading: <AdminSidebarToggle />,
  contentClassName: 'admin7-page-content',
  contentGutter: 'var(--page-gutter)',
};

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { data: currentUser } = useCurrentUser();
  const sidebarVisible = useAdminSidebarVisibility();
  const isContributor = currentUser && isContributorUser(currentUser);
  const pageChromeClasses = useAdminPageChromeClasses({
    hasNavigation: sidebarVisible,
    isEligibleUser: !!currentUser && !isContributor,
  });
  const sidebar = useAdminSidebar(pageChromeClasses?.includes('admin7-page-chrome') ?? false);
  const sidebarContext = React.useMemo(
    () => ({ enabled: sidebar.enabled, isSaving: sidebar.isSaving }),
    [sidebar.enabled, sidebar.isSaving],
  );
  const handleSidebarOpenChange = React.useCallback(
    (open: boolean) => {
      void sidebar.setOpen(open);
    },
    [sidebar.setOpen],
  );

  // Contributors get a floating profile menu instead of the full sidebar
  if (isContributor) {
    return (
      <div className="relative h-full bg-background">
        <main className="flex h-full flex-col overflow-y-auto">
          <div className="flex-1">{children}</div>
        </main>
        <div className="fixed bottom-3.5 left-3.5 z-20 lg:bottom-8 lg:left-8">
          <ContributorUserMenu />
        </div>
      </div>
    );
  }

  return (
    <AdminSidebarLayoutContext.Provider value={sidebar.enabled}>
      <AdminSidebarContext.Provider value={sidebarContext}>
        <SidebarProvider
          ref={sidebar.layoutRef}
          className={cn(pageChromeClasses, sidebar.enabled && 'admin7-sidebar-layout')}
          data-sidebar-motion={sidebar.animate ? 'animate' : 'snap'}
          keyboardShortcut={false}
          open={!!currentUser && sidebarVisible && sidebar.open}
          persistState={false}
          style={
            sidebar.enabled
              ? ({
                  '--sidebar-width': 'calc(300px + var(--panel-inset) * 2)',
                } as React.CSSProperties)
              : undefined
          }
          onOpenChange={handleSidebarOpenChange}
        >
          {sidebarVisible && (
            <AppSidebar
              {...(sidebar.enabled
                ? {
                    variant: 'floating',
                    ...(!sidebar.open ? { inert: '', 'aria-hidden': true } : {}),
                  }
                : {})}
            />
          )}
          <SidebarInset
            className={`overflow-y-auto bg-background sidebar:max-h-full ${sidebarVisible ? 'max-h-[calc(100%-var(--mobile-navbar-height))]' : 'max-h-full'}`}
          >
            <main className="flex-1">
              <ActivityPubHostLayoutProvider
                value={sidebar.enabled ? networkPageChrome : undefined}
              >
                {children}
              </ActivityPubHostLayoutProvider>
            </main>
            <MobileNavBar />
          </SidebarInset>
        </SidebarProvider>
      </AdminSidebarContext.Provider>
    </AdminSidebarLayoutContext.Provider>
  );
}
