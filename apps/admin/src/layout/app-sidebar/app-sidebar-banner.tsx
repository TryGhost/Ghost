import type { ReactNode } from 'react';

import { useSidebarBannerState } from './hooks/use-sidebar-banner-state';

interface AppSidebarBannerProps {
  banner?: ReactNode;
}

function AppSidebarBanner({ banner }: AppSidebarBannerProps) {
  const sidebarBannerState = useSidebarBannerState();
  const resolvedBanner = banner ?? sidebarBannerState.banner;

  if (!resolvedBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-[92px] left-[calc(var(--sidebar-width)/2)] z-50 w-[276px] -translate-x-1/2">
      {resolvedBanner}
    </div>
  );
}

export default AppSidebarBanner;
