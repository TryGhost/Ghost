import {Meta, createQuery} from '../utils/api/hooks';

// Types

export type TopPagesItem = {
    pathname: string;
    visits: number;
    title?: string;
}

export type TopPagesResponseType = {
    stats: TopPagesItem[];
    meta: Meta;
}

// Requests

const dataType = 'TopPagesResponseType';

export const useTopPages = createQuery<TopPagesResponseType>({
    dataType,
    path: '/stats/top-pages/'
});