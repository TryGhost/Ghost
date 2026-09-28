import { useRef } from 'react';
import { useBrowseSite } from '@tryghost/admin-x-framework/api/site';
import { useFeatureFlagOverrides } from '@tryghost/admin-x-framework/hooks';

export type AuthScreensOwner = 'react' | 'ember' | 'pending';

/**
 * Who serves the auth screens. Decided before anyone signs in, so it reads the
 * public site payload (older servers omit the field: Ember) and URL overrides,
 * the same inputs Ember's feature service uses. Held for the page's lifetime
 * once known, as Ember reads its copy once at boot.
 */
export function useAuthScreensOwner(): AuthScreensOwner {
  const { enabledFlags } = useFeatureFlagOverrides();
  const { data, isError } = useBrowseSite({ defaultErrorHandler: false });
  const decided = useRef<'react' | 'ember'>();

  if (!decided.current) {
    if (enabledFlags.includes('authReact') || data?.site.authReact === true) {
      decided.current = 'react';
    } else if (data || isError) {
      decided.current = 'ember';
    }
  }

  return decided.current ?? 'pending';
}
