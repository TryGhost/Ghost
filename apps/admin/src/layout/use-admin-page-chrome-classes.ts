import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { useLocation } from '@tryghost/admin-x-framework';
import { useIsMobile } from '@tryghost/shade/utils';
import { useThemeContext } from '@/providers/theme-context';

// Explicit rollout scopes: never generate selectors from arbitrary Labs keys.
const ADMIN_VISUAL_SCOPES = {
  pageChrome: 'admin7-page-chrome',
  typography: 'admin7-typography',
} as const;

interface AdminPageChromeEligibility {
  // Route eligibility, not the user's saved choice to collapse the sidebar.
  hasNavigation: boolean;
  isEligibleUser: boolean;
}

export function useAdminPageChromeClasses({
  hasNavigation,
  isEligibleUser,
}: AdminPageChromeEligibility): string | undefined {
  const enabled = useFeatureFlag('admin7PageChrome');
  const isMobile = useIsMobile();
  const { resolvedTheme, isThemeReady } = useThemeContext();
  const { pathname } = useLocation();
  // React sees the URL before Ember emits its fullscreen visibility update.
  // Exclude the editor immediately, including direct loads and transitions.
  const isEditor = /^\/editor(?:\/|$)/.test(pathname);
  const isSettings = /^\/settings(?:\/|$)/.test(pathname);

  if (
    !enabled ||
    !isEligibleUser ||
    isEditor ||
    isMobile ||
    !isThemeReady ||
    resolvedTheme !== 'light'
  ) {
    return undefined;
  }

  // Settings adopts typography only: never opt its existing layout into chrome.
  if (isSettings) {
    return ADMIN_VISUAL_SCOPES.typography;
  }

  return hasNavigation
    ? `${ADMIN_VISUAL_SCOPES.pageChrome} ${ADMIN_VISUAL_SCOPES.typography}`
    : undefined;
}
