import { useCallback } from 'react';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { useLocation, useNavigate } from '@tryghost/admin-x-framework';
import { getSettingsReturnTo } from '@/layout/settings-navigation';

/**
 * Leaves Settings. With admin7settings it returns to the route that opened
 * Settings, falling back to the role-based landing route.
 */
export function useExitSettings() {
  const navigate = useNavigate();
  const location = useLocation();
  const admin7Settings = useFeatureFlag('admin7settings');
  const returnTo = (admin7Settings && getSettingsReturnTo(location.state)) || '/';

  return useCallback(() => {
    navigate(returnTo);
  }, [navigate, returnTo]);
}
