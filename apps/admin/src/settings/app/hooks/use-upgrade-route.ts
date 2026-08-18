import {upgradeRoute} from '@tryghost/admin-x-framework/api/config';
import {useGlobalData} from '@/settings/app/components/providers/global-data-provider';

export function useUpgradeRoute() {
    const {config} = useGlobalData();

    return upgradeRoute(config);
}
