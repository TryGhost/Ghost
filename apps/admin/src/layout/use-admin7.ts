import { useLocation } from '@tryghost/admin-x-framework';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { useIsMobile } from '@tryghost/shade/utils';
import { useThemeContext } from '@/providers/theme-context';

interface Admin7Eligibility {
  hasNavigation: boolean;
  isEligibleUser: boolean;
}

export function useAdmin7({ hasNavigation, isEligibleUser }: Admin7Eligibility) {
  const { data: config, isPending: isConfigPending } = useBrowseConfig({
    refetchOnMount: false,
  });
  const flagEnabled = config?.config.labs?.admin7PageChrome === true;
  const isMobile = useIsMobile();
  const { isThemeReady } = useThemeContext();
  const { pathname } = useLocation();
  const isReady =
    !isEligibleUser || isMobile || (!isConfigPending && (!flagEnabled || isThemeReady));
  const enabled = flagEnabled && isEligibleUser && !isMobile && isThemeReady;
  const isSettings = /^\/settings(?:\/|$)/.test(pathname);

  return {
    isReady,
    enabled,
    pageChromeEnabled: enabled && hasNavigation && !isSettings,
  };
}
