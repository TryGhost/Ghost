import type { ReactNode } from 'react';

import { useSidebarBannerState } from './hooks/use-sidebar-banner-state';

interface AppSidebarBannerProps {
  banner?: ReactNode;
  /**
   * In the content flow rather than floating over the sidebar's foot. The
   * floating sidebar's glass is a containing block for fixed descendants and
   * clips them, so it needs this.
   */
  inline?: boolean;
}

function AppSidebarBanner({ banner, inline = false }: AppSidebarBannerProps) {
  const sidebarBannerState = useSidebarBannerState();
  const resolvedBanner = banner ?? sidebarBannerState.banner;

  if (!resolvedBanner) {
    return null;
  }

  if (inline) {
    return <div className="relative">{resolvedBanner}</div>;
  }

  return (
    <div className="fixed bottom-[92px] left-[calc(var(--sidebar-width)/2)] z-50 w-[276px] -translate-x-1/2">
      {resolvedBanner}
    </div>
  );
}

export default AppSidebarBanner;
