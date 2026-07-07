import {getSettingValue} from '@tryghost/admin-x-framework/api/settings';
import {useAnalyticsData} from '@/analytics/hooks/use-analytics-data';

/**
 * Simple hook to check if a labs feature flag is enabled
 *
 * @param flagName The name of the labs feature flag to check
 * @returns boolean indicating if the flag is enabled
 */
export const useLabsFlag = (flagName: string): boolean => {
    const {settings} = useAnalyticsData();
    const labsJSON = getSettingValue<string>(settings, 'labs') || '{}';

    try {
        const labs = JSON.parse(labsJSON) as Record<string, unknown>;
        return labs[flagName] === true;
    } catch {
        return false;
    }
};
