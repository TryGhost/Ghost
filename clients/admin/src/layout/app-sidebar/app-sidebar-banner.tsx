import type { ReactNode } from 'react';
import { cn } from '@tryghost/shade/utils';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';

import { useSidebarBannerState } from './hooks/use-sidebar-banner-state';

interface AppSidebarBannerProps {
  banner?: ReactNode;
  className?: string;
}

function AppSidebarBanner({ banner, className }: AppSidebarBannerProps) {
  const admin7Design = useFeatureFlag('admin7Design');
  const sidebarBannerState = useSidebarBannerState();
  const resolvedBanner = banner ?? sidebarBannerState.banner;

  if (!resolvedBanner) {
    return null;
  }

  return (
    <div className={cn('relative', admin7Design && '[&>[data-slot=banner]]:mx-0', className)}>
      {resolvedBanner}
    </div>
  );
}

export default AppSidebarBanner;
