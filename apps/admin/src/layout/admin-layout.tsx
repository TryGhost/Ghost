import { ActivityPubHostLayoutProvider } from '@tryghost/activitypub/api';
import React from 'react';
import { SidebarInset, SidebarProvider } from '@tryghost/shade/components';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { isContributorUser } from '@tryghost/admin-x-framework/api/users';
import { useAdminSidebarVisibility } from '@/layout/sidebar-visibility';
import { useAdminPageChromeClasses } from '@/layout/use-admin-page-chrome-classes';
import { AdminPageChromeContext } from '@/layout/admin-page-chrome-context';
import { cn } from '@tryghost/shade/utils';
import AppSidebar from './app-sidebar';
import { MobileNavBar } from './app-sidebar/mobile-nav-bar';
import { ContributorUserMenu } from './app-sidebar/user-menu';

const networkPageChrome = {
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
  const pageChromeEnabled = pageChromeClasses?.includes('admin7-page-chrome') ?? false;

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
    <AdminPageChromeContext.Provider value={pageChromeEnabled}>
      <SidebarProvider
        className={cn(pageChromeClasses, pageChromeEnabled && 'admin7-sidebar-layout')}
        open={!!currentUser && sidebarVisible}
        style={
          pageChromeEnabled ? ({ '--sidebar-width': '316px' } as React.CSSProperties) : undefined
        }
      >
        {sidebarVisible && <AppSidebar variant={pageChromeEnabled ? 'floating' : undefined} />}
        <SidebarInset
          className={`overflow-y-auto bg-background sidebar:max-h-full ${sidebarVisible ? 'max-h-[calc(100%-var(--mobile-navbar-height))]' : 'max-h-full'}`}
        >
          <main className="flex-1">
            <ActivityPubHostLayoutProvider
              value={pageChromeEnabled ? networkPageChrome : undefined}
            >
              {children}
            </ActivityPubHostLayoutProvider>
          </main>
          <MobileNavBar />
        </SidebarInset>
      </SidebarProvider>
    </AdminPageChromeContext.Provider>
  );
}
