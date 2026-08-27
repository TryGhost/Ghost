import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { useLocation } from '@tryghost/admin-x-framework';
import { useIsMobile } from '@tryghost/shade/utils';
import { useThemeContext } from '@/providers/theme-context';

interface Admin7Eligibility {
  hasNavigation: boolean;
  isEligibleUser: boolean;
}

export function useAdmin7({ hasNavigation, isEligibleUser }: Admin7Eligibility) {
  const flagEnabled = useFeatureFlag('admin7PageChrome');
  const isMobile = useIsMobile();
  const { resolvedTheme, isThemeReady } = useThemeContext();
  const { pathname } = useLocation();
  const enabled =
    flagEnabled && isEligibleUser && !isMobile && isThemeReady && resolvedTheme === 'light';
  const isSettings = /^\/settings(?:\/|$)/.test(pathname);

  return {
    enabled,
    pageChromeEnabled: enabled && hasNavigation && !isSettings,
  };
}
