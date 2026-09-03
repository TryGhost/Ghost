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

const pageChromeClassName = [
  'admin7:[&_.max-w-page]:max-w-(--content-width)',
  'admin7:[&_[data-list-page=list-page]]:px-(--page-gutter)',
  'admin7:[&_[data-detail-page=detail-page]]:px-(--page-gutter)',
  'admin7:[&_[data-list-page=header]]:-mx-(--page-gutter)',
  'admin7:[&_[data-list-page=header]]:px-(--page-gutter)',
  'admin7:[&_[data-list-page=header]]:pt-[28px]',
  'admin7:[&_[data-detail-page=header]]:pt-[28px]',
  'admin7:[&_[data-network-header=header]]:pt-[8px]',
  'admin7:[&_[data-page-header=main]]:flex-wrap',
  'admin7:[&_[data-page-header=left]]:h-auto',
  'admin7:[&_[data-page-header=left]]:max-w-full',
  'admin7:[&_.admin-x-container-error]:bg-background',
  'admin7:[&_.gh-canvas]:max-w-(--content-width)',
  'admin7:[&_.gh-canvas]:px-(--page-gutter)',
  'admin7:[&_.gh-main-width]:max-w-(--content-width)',
  'admin7:[&_.gh-main-width]:px-(--page-gutter)',
  'admin7:[&_.gh-canvas-header]:-mx-(--page-gutter)',
  'admin7:[&_.gh-canvas-header]:px-(--page-gutter)',
  'admin7:[&_.gh-canvas-header]:pt-[28px]!',
  'admin7:[&_.gh-canvas-header]:pb-[28px]!',
  'admin7:[&_[data-view-site-preview]]:inset-y-2!',
  'admin7:[&_[data-view-site-preview]]:right-2!',
  'admin7:[&_[data-view-site-preview]]:left-0!',
  'admin7:[&_[data-view-site-preview]]:h-[calc(100%-16px)]!',
  'admin7:[&_[data-view-site-preview]]:w-[calc(100%-8px)]!',
  'admin7:[&_[data-view-site-preview]]:rounded-xl!',
  'admin7:[&_[data-view-site-preview]]:border!',
  'admin7:[&_[data-view-site-preview]]:border-[var(--border-subtle)]!',
].join(' ');

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { data: currentUser } = useCurrentUser();
  const sidebarVisible = useAdminSidebarVisibility();
  const isContributor = currentUser && isContributorUser(currentUser);
  const {
    isReady: admin7Ready,
    enabled: admin7Enabled,
    pageChromeEnabled,
  } = useAdmin7({
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
        !admin7Ready && 'invisible',
        admin7Enabled && 'admin7',
        pageChromeEnabled &&
          'overflow-hidden [--content-width:1080px] [--page-gutter:40px] min-[1380px]:[--content-width:1280px] [&_[data-sidebar=sidebar]]:rounded-xl [&_[data-sidebar=sidebar]]:border-[var(--border-subtle)] [&_[data-sidebar=sidebar]]:shadow-none [&>main]:min-w-0',
      )}
      open={!!currentUser && sidebarVisible}
      style={
        pageChromeEnabled ? ({ '--sidebar-width': '316px' } as React.CSSProperties) : undefined
      }
    >
      {sidebarVisible && <AppSidebar variant={pageChromeEnabled ? 'floating' : undefined} />}
      <SidebarInset
        className={`overflow-y-auto bg-background sidebar:max-h-full ${sidebarVisible ? 'max-h-[calc(100%-var(--mobile-navbar-height))]' : 'max-h-full'}`}
      >
        <main className={cn('flex-1', pageChromeEnabled && pageChromeClassName)}>
          <ActivityPubHostLayoutProvider value={pageChromeEnabled ? networkPageChrome : undefined}>
            {children}
          </ActivityPubHostLayoutProvider>
        </main>
        <MobileNavBar />
      </SidebarInset>
    </SidebarProvider>
  );
}
