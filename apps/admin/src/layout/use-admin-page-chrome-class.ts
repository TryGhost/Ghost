import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { useLocation } from '@tryghost/admin-x-framework';
import { useIsMobile } from '@tryghost/shade/utils';
import { useThemeContext } from '@/providers/theme-context';

// Explicit rollout scopes: never generate selectors from arbitrary Labs keys.
const ADMIN_VISUAL_SCOPES = {
  admin7PageChrome: 'admin7-page-chrome',
} as const;

// hasNavigation describes route/role eligibility, not the user's saved choice
// to collapse the sidebar. Collapsing navigation must not remove its scope.
export function useAdminPageChromeClass(hasNavigation: boolean): string | undefined {
  const enabled = useFeatureFlag('admin7PageChrome');
  const isMobile = useIsMobile();
  const { resolvedTheme, isThemeReady } = useThemeContext();
  const { pathname } = useLocation();
  // React sees the URL before Ember emits its fullscreen visibility update.
  // Exclude the editor immediately, including direct loads and transitions.
  const isEditor = /^\/editor(?:\/|$)/.test(pathname);

  return enabled &&
    hasNavigation &&
    !isEditor &&
    !isMobile &&
    isThemeReady &&
    resolvedTheme === 'light'
    ? ADMIN_VISUAL_SCOPES.admin7PageChrome
    : undefined;
}
