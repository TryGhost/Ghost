import {Meta, createQuery} from '../utils/api/hooks';

export interface TinybirdToken {
    token: string;
}

export interface TinybirdTokenResponseType {
    meta?: Meta;
    tinybird: TinybirdToken;
}

const dataType = 'TinybirdTokenResponseType';

export const getTinybirdToken = createQuery<TinybirdTokenResponseType>({
    dataType,
    path: '/tinybird/token/'
});