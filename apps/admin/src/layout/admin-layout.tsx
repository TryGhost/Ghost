import { ActivityPubHostLayoutProvider } from '@tryghost/activitypub/api';
import React from 'react';
import { SidebarInset, SidebarProvider } from '@tryghost/shade/components';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { isContributorUser } from '@tryghost/admin-x-framework/api/users';
import { useAdminSidebarVisibility } from '@/layout/sidebar-visibility';
import { useAdmin7 } from '@/layout/use-admin7';
import { cn } from '@tryghost/shade/utils';
import AppSidebar from './app-sidebar';
import { MobileNavBar } from './app-sidebar/mobile-nav-bar';
import { ContributorUserMenu } from './app-sidebar/user-menu';

const networkPageChrome = {
  contentClassName: 'admin7:max-w-(--content-width)',
  contentGutter: 'var(--page-gutter)',
};

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { data: currentUser } = useCurrentUser();
  const sidebarVisible = useAdminSidebarVisibility();
  const isContributor = currentUser && isContributorUser(currentUser);
  const { enabled: admin7Enabled, pageChromeEnabled } = useAdmin7({
    hasNavigation: sidebarVisible,
    isEligibleUser: !!currentUser && !isContributor,
  });

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
    <SidebarProvider
      className={cn(
        admin7Enabled && 'admin7',
        pageChromeEnabled &&
          'overflow-hidden [--content-width:1080px] [--page-gutter:40px] [--sidebar-width:316px] min-[1380px]:[--content-width:1280px] [&_[data-sidebar=sidebar]]:rounded-xl [&_[data-sidebar=sidebar]]:border-[var(--border-subtle)] [&_[data-sidebar=sidebar]]:shadow-none [&>main]:min-w-0',
      )}
      open={!!currentUser && sidebarVisible}
    >
      {sidebarVisible && <AppSidebar variant={pageChromeEnabled ? 'floating' : undefined} />}
      <SidebarInset
        className={`overflow-y-auto bg-background sidebar:max-h-full ${sidebarVisible ? 'max-h-[calc(100%-var(--mobile-navbar-height))]' : 'max-h-full'}`}
      >
        <main className="flex-1">
          <ActivityPubHostLayoutProvider value={pageChromeEnabled ? networkPageChrome : undefined}>
            {children}
          </ActivityPubHostLayoutProvider>
        </main>
        <MobileNavBar />
      </SidebarInset>
    </SidebarProvider>
  );
}
