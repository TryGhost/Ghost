import {useBrowseConfig} from '../api/config';

/**
 * Returns whether a Labs flag is explicitly enabled. Only boolean `true`
 * counts — `false` while config is loading, missing, or failed.
 */
export const useFeatureFlag = (flag: string): boolean => {
    const {data: config} = useBrowseConfig();
    return config?.config.labs?.[flag] === true;
};
