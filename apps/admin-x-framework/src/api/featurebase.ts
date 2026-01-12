import {Meta, createQuery} from '../utils/api/hooks';

export interface FeaturebaseToken {
    token: string;
}

export interface FeaturebaseTokenResponseType {
    meta?: Meta;
    featurebase: FeaturebaseToken;
}

const dataType = 'FeaturebaseTokenResponseType';

export const getFeaturebaseToken = createQuery<FeaturebaseTokenResponseType>({
    dataType,
    path: '/featurebase/token/'
});
