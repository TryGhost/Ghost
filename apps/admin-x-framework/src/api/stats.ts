import {Meta, createQuery} from '../utils/api/hooks';

// Types

export type TopContentItem = {
    pathname: string;
    visits: number;
    title?: string;
}

export type TopContentResponseType = {
    stats: TopContentItem[];
    meta: Meta;
}

// Requests

const dataType = 'TopContentResponseType';

export const useTopContent = createQuery<TopContentResponseType>({
    dataType,
    path: '/stats/top-content/'
});