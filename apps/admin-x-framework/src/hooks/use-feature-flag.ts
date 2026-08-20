import {useBrowseConfig} from '../api/config';

/**
 * Returns whether a Labs flag is explicitly enabled. Only boolean `true`
 * counts — `false` while config is loading, missing, or failed.
 * Avoids refetching stale config when a feature-gated component mounts.
 */
export const useFeatureFlag = (flag: string): boolean => {
    const {data: config} = useBrowseConfig({refetchOnMount: false});
    return config?.config.labs?.[flag] === true;
};
