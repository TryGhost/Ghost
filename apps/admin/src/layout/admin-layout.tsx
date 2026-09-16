import { ActivityPubHostLayoutProvider } from '@tryghost/activitypub/api';
import React from 'react';
import { SidebarInset, SidebarProvider } from '@tryghost/shade/components';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { isContributorUser } from '@tryghost/admin-x-framework/api/users';
import { useAdminSidebarVisibility } from '@/layout/sidebar-visibility';
import { cn } from '@tryghost/shade/utils';
import AppSidebar from './app-sidebar';
import { MobileNavBar } from './app-sidebar/mobile-nav-bar';
import { ContributorUserMenu } from './app-sidebar/user-menu';

const networkPageChrome = {
  contentClassName: 'max-w-(--content-width)',
  contentGutter: 'var(--page-gutter)',
};

const pageChromeClassName = [
  '[&_.max-w-page]:max-w-(--content-width)',
  '[&_[data-list-page=list-page]]:px-(--page-gutter)',
  '[&_[data-detail-page=detail-page]]:px-(--page-gutter)',
  '[&_[data-list-page=header]]:-mx-(--page-gutter)',
  '[&_[data-list-page=header]]:px-(--page-gutter)',
  '[&_[data-list-page=header]]:pt-[28px]',
  '[&_[data-detail-page=header]]:pt-[28px]',
  '[&_[data-network-header=header]]:pt-[8px]',
  '[&_[data-page-header=main]]:flex-wrap',
  '[&_[data-page-header=left]]:h-auto',
  '[&_[data-page-header=left]]:max-w-full',
  '[&_.admin-x-container-error]:bg-background',
  '[&_.gh-canvas]:max-w-(--content-width)',
  '[&_.gh-canvas]:px-(--page-gutter)',
  '[&_.gh-main-width]:max-w-(--content-width)',
  '[&_.gh-main-width]:px-(--page-gutter)',
  '[&_.gh-canvas-header]:-mx-(--page-gutter)',
  '[&_.gh-canvas-header]:px-(--page-gutter)',
  '[&_.gh-canvas-header]:pt-[28px]!',
  '[&_.gh-canvas-header]:pb-[28px]!',
  '[&_[data-view-site-preview]]:inset-y-2!',
  '[&_[data-view-site-preview]]:right-2!',
  '[&_[data-view-site-preview]]:left-0!',
  '[&_[data-view-site-preview]]:h-[calc(100%-16px)]!',
  '[&_[data-view-site-preview]]:w-[calc(100%-8px)]!',
  '[&_[data-view-site-preview]]:rounded-xl!',
  '[&_[data-view-site-preview]]:border!',
  '[&_[data-view-site-preview]]:border-[var(--border-subtle)]!',
].join(' ');

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { data: currentUser } = useCurrentUser();
  const sidebarVisible = useAdminSidebarVisibility();
  const isContributor = currentUser && isContributorUser(currentUser);

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
        sidebarVisible &&
          'overflow-hidden [--content-width:1080px] [--page-gutter:20px] sidebar:[--page-gutter:40px] min-[1380px]:[--content-width:1280px] [&_[data-sidebar=sidebar]]:rounded-xl [&_[data-sidebar=sidebar]]:border-border [&_[data-sidebar=sidebar]]:shadow-none [&>main]:min-w-0',
      )}
      open={!!currentUser && sidebarVisible}
      style={sidebarVisible ? ({ '--sidebar-width': '316px' } as React.CSSProperties) : undefined}
    >
      {sidebarVisible && <AppSidebar variant="floating" />}
      <SidebarInset
        className={`overflow-y-auto bg-background sidebar:max-h-full ${sidebarVisible ? 'max-h-[calc(100%-var(--mobile-navbar-height))]' : 'max-h-full'}`}
      >
        <main className={cn('flex-1', sidebarVisible && pageChromeClassName)}>
          <ActivityPubHostLayoutProvider value={sidebarVisible ? networkPageChrome : undefined}>
            {children}
          </ActivityPubHostLayoutProvider>
        </main>
        <MobileNavBar />
      </SidebarInset>
    </SidebarProvider>
  );
}
