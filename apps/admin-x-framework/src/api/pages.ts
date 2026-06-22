import {InfiniteData} from '@tanstack/react-query';
import {Meta, createInfiniteQuery, createMutation, createQuery, createQueryWithId} from '../utils/api/hooks';

export type Page = {
    id: string;
    title: string;
    slug: string;
    url: string;
    uuid: string;
    feature_image?: string;
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

export const getPage = createQueryWithId<PagesResponseType>({
    dataType,
    path: id => `/pages/${id}/`
});

export const useDeletePage = createMutation<unknown, string>({
    method: 'DELETE',
    path: id => `/pages/${id}/`
});

export const useBrowsePagesInfinite = createInfiniteQuery<PagesResponseType & {isEnd: boolean}>({
    dataType,
    path: '/pages/',
    defaultNextPageParams: (lastPage, otherParams) => {
        if (!lastPage.meta?.pagination.next) {
            return undefined;
        }

        return {
            ...otherParams,
            page: lastPage.meta.pagination.next.toString()
        };
    },
    returnData: (originalData) => {
        const {pages: queryPages} = originalData as InfiniteData<PagesResponseType>;
        const pages = queryPages.flatMap(page => page.pages);
        const meta = queryPages[queryPages.length - 1].meta;

        return {
            pages,
            meta,
            isEnd: meta ? meta.pagination.pages === meta.pagination.page : true
        };
    }
});
