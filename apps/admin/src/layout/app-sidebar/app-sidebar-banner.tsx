import type { ReactNode } from 'react';
import { cn } from '@tryghost/shade/utils';

import { useSidebarBannerState } from './hooks/use-sidebar-banner-state';

interface AppSidebarBannerProps {
  banner?: ReactNode;
  className?: string;
}

function AppSidebarBanner({ banner, className }: AppSidebarBannerProps) {
  const sidebarBannerState = useSidebarBannerState();
  const resolvedBanner = banner ?? sidebarBannerState.banner;

  if (!resolvedBanner) {
    return null;
  }

  return <div className={cn('relative', className)}>{resolvedBanner}</div>;
}

export default AppSidebarBanner;
