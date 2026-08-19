import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";
import { useEmberFeatureFlag } from "./ember-bridge";

/**
 * Who serves a flag-gated route right now: Ember's Labs state is authoritative
 * when Ember is present; a standalone React admin falls back to the config
 * query. `pending` while either is still loading.
 */
export function useFlagGatedRouteOwner(flag: string): 'react' | 'ember' | 'pending' {
    const { data: config, isError, isLoading } = useBrowseConfig();
    const emberFlag = useEmberFeatureFlag(flag);

    if (typeof emberFlag === 'boolean') {
        return emberFlag ? 'react' : 'ember';
    }
    if (emberFlag === null || isLoading) {
        return 'pending';
    }
    if (isError || !config) {
        return 'ember';
    }
    return config.config.labs?.[flag] === true ? 'react' : 'ember';
}
