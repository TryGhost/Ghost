import { useLocation } from '@tryghost/admin-x-framework';
import { useIsMobile } from '@tryghost/shade/utils';
import { useThemeContext } from '@/providers/theme-context';

interface Admin7Eligibility {
  hasNavigation: boolean;
  isEligibleUser: boolean;
}

export function useAdmin7({ hasNavigation, isEligibleUser }: Admin7Eligibility) {
  const isMobile = useIsMobile();
  const { isThemeReady } = useThemeContext();
  const { pathname } = useLocation();
  const isReady = !isEligibleUser || isMobile || isThemeReady;
  const enabled = isEligibleUser && !isMobile && isThemeReady;
  const isSettings = /^\/settings(?:\/|$)/.test(pathname);

  return {
    isReady,
    enabled,
    pageChromeEnabled: enabled && hasNavigation && !isSettings,
  };
}
