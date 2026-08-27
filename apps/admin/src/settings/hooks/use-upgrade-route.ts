import { upgradeRoute } from '@tryghost/admin-x-framework/api/config';
import { useConfig } from '@/settings/hooks/use-settings-data';

export function useUpgradeRoute() {
  const config = useConfig();

  return upgradeRoute(config);
}
