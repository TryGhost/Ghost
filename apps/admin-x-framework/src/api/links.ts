import {Meta, createQuery} from '../utils/api/hooks';

export type LinkResponseType = {
    links: LinkItem[];
    meta: Meta;
}

export type LinkItem = {
    post_id: string;
    link: {
        link_id: string;
        from: string;
        to: string;
        edited: boolean;
    },
    count: {
        clicks: number;
    }
}

export const useTopLinks = createQuery<LinkResponseType>({
    dataType: 'LinkResponseType',
    path: '/links/'
});