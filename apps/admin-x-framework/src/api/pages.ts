import {Meta, createQuery} from '../utils/api/hooks';

export type Page = {
    id: string;
    title: string;
    slug: string;
    url: string;
    status?: string;
    published_at?: string;
};

export interface PagesResponseType {
    meta?: Meta
    pages: Page[];
}

const dataType = 'PagesResponseType';

export const useBrowsePages = createQuery<PagesResponseType>({
    dataType,
    path: '/pages/'
});
