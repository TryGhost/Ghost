import { useCallback } from 'react';
import { useLocation, useNavigate } from '@tryghost/admin-x-framework';
import { getSettingsReturnTo } from '@/layout/settings-navigation';

/**
 * Leaves Settings, returning to the route that opened
 * Settings, falling back to the role-based landing route.
 */
export function useExitSettings() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = getSettingsReturnTo(location.state) || '/';

  return useCallback(() => {
    navigate(returnTo);
  }, [navigate, returnTo]);
}
