import { Outlet } from '@tryghost/admin-x-framework';
import { NotFound } from '@/shared/not-found';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';

/**
 * Serves the `/apps` routes only while the `apps` Labs flag is on. While the
 * config is still loading nothing is rendered so the 404 does not flash for
 * admins who have the flag enabled.
 */
export function AppsFlagGuard() {
  const enabled = useFeatureFlag('apps');
  const { isLoading } = useBrowseConfig();

  if (enabled) {
    return <Outlet />;
  }
  return isLoading ? null : <NotFound />;
}

export default AppsFlagGuard;
