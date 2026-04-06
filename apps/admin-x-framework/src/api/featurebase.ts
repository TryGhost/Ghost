import {Meta, createQuery} from '../utils/api/hooks';

export interface FeaturebaseToken {
    token: string;
}

export interface FeaturebaseTokenResponseType {
    meta?: Meta;
    featurebase: FeaturebaseToken;
}

const dataType = 'FeaturebaseTokenResponseType';

// Tokens expire after 7 days - refresh at 6 days
// Refresh can trigger re-initialization widgets using the token
const FEATUREBASE_QUERY_OPTIONS = {
    staleTime: 5 * 24 * 60 * 60 * 1000, // 5 days
    refetchInterval: 6 * 24 * 60 * 60 * 1000, // 6 days
    refetchIntervalInBackground: true
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
