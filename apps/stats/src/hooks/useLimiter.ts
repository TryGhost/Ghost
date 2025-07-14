import {useGlobalData} from '@src/providers/GlobalDataProvider';

interface ConfigHostSettings {
    hostSettings?: {
        limits?: {
            limitAnalytics?: {
                disabled?: boolean;
            };
        };
    };
}

export const useLimiter = () => {
    const {data} = useGlobalData();
    
    const isLimited = (limitName: string): boolean => {
        const config = data?.config as ConfigHostSettings;
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