import { useQueryClient } from '@tanstack/react-query';
import { useBrowseSite } from '@tryghost/admin-x-framework/api/site';
import { useFeatureFlagOverrides } from '@tryghost/admin-x-framework/hooks';

export type AuthScreensOwner = 'react' | 'ember' | 'pending';

// One decision per app instance (its query client): later `/site/` refetches,
// e.g. after a Labs change, must not move screens Ember has already parked.
const decisions = new WeakMap<object, 'react' | 'ember'>();

/**
 * Who serves the auth screens. Decided before anyone signs in, so it reads the
 * public site payload (older servers omit the field: Ember) and URL overrides,
 * the same inputs Ember's feature service uses once at boot.
 */
export function useAuthScreensOwner(): AuthScreensOwner {
  const queryClient = useQueryClient();
  const { enabledFlags } = useFeatureFlagOverrides();
  const { data, isError } = useBrowseSite({ defaultErrorHandler: false });

  if (!decisions.has(queryClient)) {
    if (enabledFlags.includes('authReact') || data?.site.authReact === true) {
      decisions.set(queryClient, 'react');
    } else if (data) {
      decisions.set(queryClient, 'ember');
    }
  }

  // A failed read defers to Ember without deciding, so a later success can still decide.
  return decisions.get(queryClient) ?? (isError ? 'ember' : 'pending');
}
