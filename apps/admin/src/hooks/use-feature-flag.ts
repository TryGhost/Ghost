import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";

export const useFeatureFlag = (flag: string): boolean => {
    const { data: config } = useBrowseConfig();
    return config?.config.labs?.[flag] ?? false;
};
