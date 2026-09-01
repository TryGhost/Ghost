import { InfiniteData } from '@tanstack/react-query';
import {
  Meta,
  createInfiniteQuery,
  createMutation,
  createQuery,
  createQueryWithId,
} from '../utils/api/hooks';
import { PageWriteOptions, buildPageWriteParams, serializePostPayload } from './post-contract';
import type { Email, PostBulkAction, PostEditorFields, PostListFields } from './posts';

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
} & PostListFields &
  PostEditorFields;

/**
 * Fields a client may set on a page. Email fields are excluded — pages are
 * never emailed — and the request contract strips them, along with read-only
 * relations, at request time.
 */
export type PageEditableData = Partial<
  Omit<
    Page,
    | 'id'
    | 'uuid'
    | 'url'
    | 'count'
    | 'email'
    | 'newsletter'
    | 'post_revisions'
    | 'email_subject'
    | 'email_only'
    | 'primary_author'
    | 'primary_tag'
    | 'created_at'
    | 'excerpt'
  >
>;

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

export const usePage = createQueryWithId<PagesResponseType>({
  dataType,
  path: (id) => `/pages/${id}/`,
});

export interface AddPagePayload {
  page: PageEditableData;
  options?: PageWriteOptions;
}

export interface EditPagePayload {
  page: PageEditableData & { id: string };
  options?: PageWriteOptions;
}

export const useAddPage = createMutation<PagesResponseType, AddPagePayload>({
  method: 'POST',
  path: () => '/pages/',
  searchParams: ({ options }) => buildPageWriteParams(options),
  body: ({ page }) => ({ pages: [serializePostPayload(page, 'page')] }),
  invalidateQueries: { dataType },
});

export const useEditPage = createMutation<PagesResponseType, EditPagePayload>({
  method: 'PUT',
  path: ({ page }) => `/pages/${page.id}/`,
  searchParams: ({ options }) => buildPageWriteParams(options),
  body: ({ page }) => ({ pages: [serializePostPayload(page, 'page')] }),
  invalidateQueries: { dataType },
});

/** Duplicate a page. As with posts, the copy is always a draft. */
export const useCopyPage = createMutation<PagesResponseType, string>({
  method: 'POST',
  path: (id) => `/pages/${id}/copy/`,
});

/** Bulk-edit pages matching an NQL filter. See `useBulkEditPosts`. */
export const useBulkEditPages = createMutation<unknown, { filter: string; action: PostBulkAction }>(
  {
    method: 'PUT',
    path: () => '/pages/bulk/',
    searchParams: ({ filter }) => ({ filter }),
    body: ({ action }) => ({
      bulk: {
        action: action.type,
        meta: 'meta' in action ? action.meta : {},
      },
    }),
  },
);

/** Bulk-delete pages matching an NQL filter. */
export const useBulkDeletePages = createMutation<unknown, { filter: string }>({
  method: 'DELETE',
  path: () => '/pages/',
  searchParams: ({ filter }) => ({ filter }),
});
