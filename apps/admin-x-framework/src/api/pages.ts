import { InfiniteData } from '@tanstack/react-query';
import { Meta, createInfiniteQuery, createQuery } from '../utils/api/hooks';
import type { Email, PostListFields } from './posts';

// A page is a post with `displayName: 'page'` server-side, so the list screens
// read the same fields off both.
export type Page = {
    id: string;
    title: string;
    slug: string;
    url: string;
    status?: string;
    published_at?: string;
    visibility?: string;
    uuid?: string;
    feature_image?: string;
    email?: Email;
    count?: {
        clicks?: number;
    };
    // Pages are never emailed, but the list reads these off both resources
    // through one type, so they have to be addressable here too.
    email_only?: boolean;
    email_segment?: string;
    newsletter?: object;
} & PostListFields;

export interface PagesResponseType {
  meta?: Meta;
  pages: Page[];
}

const dataType = 'PagesResponseType';

export const useBrowsePages = createQuery<PagesResponseType>({
  dataType,
  path: '/pages/',
});

export const useBrowsePagesInfinite = createInfiniteQuery<PagesResponseType & { isEnd: boolean }>({
  dataType,
  path: '/pages/',
  defaultNextPageParams: (lastPage, otherParams) => {
    if (!lastPage.meta?.pagination.next) {
      return undefined;
    }

    return {
      ...otherParams,
      page: lastPage.meta.pagination.next.toString(),
    };
  },
  returnData: (originalData) => {
    const { pages: queryPages } = originalData as InfiniteData<PagesResponseType>;
    const pages = queryPages.flatMap((page) => page.pages);
    const meta = queryPages[queryPages.length - 1].meta;

    return {
      pages,
      meta,
      isEnd: meta ? meta.pagination.pages === meta.pagination.page : true,
    };
  },
});
