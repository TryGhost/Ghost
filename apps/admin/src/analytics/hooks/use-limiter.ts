import {useAnalyticsData} from '@/analytics/hooks/use-analytics-data';

export const useLimiter = () => {
    const {config} = useAnalyticsData();

    const isLimited = (limitName: string): boolean => {
        if (!config?.hostSettings?.limits) {
            return false;
        }

        if (limitName === 'limitAnalytics') {
            return config.hostSettings.limits.limitAnalytics?.disabled === true;
        }

        return false;
    };

    return {
        isLimited
    };
};
