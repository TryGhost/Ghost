import { InfiniteData } from '@tanstack/react-query';
import {
  Meta,
  createInfiniteQuery,
  createMutation,
  createQuery,
  createQueryWithId,
} from '../utils/api/hooks';
import {
  PageWriteOptions,
  PostCreateOptions,
  buildPostEditorReadParams,
  buildPageWriteParams,
  buildPostReadParams,
  serializePostPayload,
} from './post-contract';
import type {
  Email,
  PostBulkAction,
  PostEditableData,
  PostEditorFields,
  PostListFields,
  PostStatus,
  PostAuthor,
  PostTag,
  PostTier,
} from './posts';

// A page is a post with `displayName: 'page'` server-side, so the list screens
// read the same fields off both.
export type Page = {
  id: string;
  title: string;
  slug: string;
  url: string;
  status?: Exclude<PostStatus, 'sent'>;
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
export type PageEditableData = Omit<PostEditableData, 'email_only' | 'email_subject' | 'status'> & {
  status?: Exclude<PostStatus, 'sent'>;
  show_title_and_feature_image?: boolean;
};

export interface PagesResponseType {
  meta?: Meta;
  pages: Page[];
}

/** Single-resource reads and writes contain relations safe to send back on edit. */
export type PageEditorRecord = Omit<Page, 'authors' | 'tags' | 'tiers' | 'updated_at'> & {
  updated_at: string | null;
  authors?: Array<PostAuthor & { id: string }>;
  tags?: Array<PostTag & { id: string }>;
  tiers?: PostTier[];
};

export interface PageResponseType {
  meta?: Meta;
  pages: PageEditorRecord[];
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

const usePageQuery = createQueryWithId<PageResponseType>({
  dataType,
  path: (id) => `/pages/${id}/`,
});

export const usePage = (id: string, options: Parameters<typeof usePageQuery>[1] = {}) => {
  const { searchParams, ...queryOptions } = options;
  return usePageQuery(id, {
    ...queryOptions,
    searchParams: { ...buildPostReadParams(), ...searchParams },
  });
};

const useEditorPageQuery = createQueryWithId<PageResponseType>({
  dataType,
  path: (id) => `/pages/${id}/`,
});

export const useEditorPage = (
  id: string,
  options: Parameters<typeof useEditorPageQuery>[1] = {},
) => {
  const { searchParams, ...queryOptions } = options;
  return useEditorPageQuery(id, {
    ...queryOptions,
    searchParams: { ...searchParams, ...buildPostEditorReadParams() },
  });
};

// The create endpoint only accepts include/formats/source - revision and
// email delivery options are update-only
export interface AddPagePayload {
  page: PageEditableData & { title: string };
  options?: PostCreateOptions;
}

export interface EditPagePayload {
  page: PageEditableData & { id: string; updated_at: string | null };
  options?: PageWriteOptions;
}

export const useAddPage = createMutation<PageResponseType, AddPagePayload>({
  method: 'POST',
  path: () => '/pages/',
  searchParams: ({ options }) => buildPageWriteParams(options),
  body: ({ page }) => ({ pages: [serializePostPayload(page, 'page')] }),
  invalidateQueries: { dataType },
});

export const useEditPage = createMutation<PageResponseType, EditPagePayload>({
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
