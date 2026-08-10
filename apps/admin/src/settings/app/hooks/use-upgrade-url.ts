import {upgradeRoute} from '@tryghost/admin-x-framework/api/config';
import {useGlobalData} from '@/settings/app/components/providers/global-data-provider';

export function useUpgradeUrl() {
    const {config} = useGlobalData();

    return upgradeRoute(config);
}
