import {Meta, createQuery} from '../utils/api/hooks';

export interface FeaturebaseToken {
    token: string;
}

export interface FeaturebaseTokenResponseType {
    meta?: Meta;
    featurebase: FeaturebaseToken;
}

const dataType = 'FeaturebaseTokenResponseType';

// Built-in query options for optimal token caching
const FEATUREBASE_QUERY_OPTIONS = {
    refetchInterval: 29 * 24 * 60 * 60 * 1000, // 29 days — tokens expire after 30 days
    refetchIntervalInBackground: true,
    staleTime: 28 * 24 * 60 * 60 * 1000 // 28 days - shorter than refetch interval so automatic refresh works
} as const;

const baseFeaturebaseTokenQuery = createQuery<FeaturebaseTokenResponseType>({
    dataType,
    path: '/featurebase/token/'
});

export const getFeaturebaseToken = (options: { enabled?: boolean } = {}) => {
    return baseFeaturebaseTokenQuery({
        ...FEATUREBASE_QUERY_OPTIONS,
        ...options
    });
};
