import {Meta, createQuery} from '../utils/api/hooks';

export interface TinybirdToken {
    token: string;
    exp?: number;
}

export interface TinybirdTokenResponseType {
    meta?: Meta;
    tinybird: TinybirdToken;
}

const dataType = 'TinybirdTokenResponseType';

// Built-in query options for optimal token caching
const TINYBIRD_QUERY_OPTIONS = {
    refetchInterval: 120 * 60 * 1000, // 2 hours — tokens expire after 3 hours
    refetchIntervalInBackground: true,
    staleTime: 110 * 60 * 1000 // 110 minutes - shorter than refetch interval so automatic refresh works
} as const;

const baseTinybirdTokenQuery = createQuery<TinybirdTokenResponseType>({
    dataType,
    path: '/tinybird/token/'
});

export const getTinybirdToken = (options: { enabled?: boolean } = {}) => {
    return baseTinybirdTokenQuery({
        ...TINYBIRD_QUERY_OPTIONS,
        ...options
    });
};