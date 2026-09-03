import { InfiniteData } from '@tanstack/react-query';
import {
  Meta,
  createInfiniteQuery,
  createQuery,
  createQueryWithId,
  createMutation,
} from '../utils/api/hooks';
import {
  PostWriteOptions,
  PostCreateOptions,
  buildPostEditorReadParams,
  buildPostReadParams,
  buildPostWriteParams,
  serializePostPayload,
} from './post-contract';
import type {
  CreateContentData,
  EditContentData,
  Post,
  PostBulkAction,
  PostEditableData,
  PostEditorRecord,
} from './content-types';

export type {
  Email,
  Post,
  PostAuthor,
  PostAuthorInput,
  PostBulkAction,
  PostEditableData,
  PostEditorFields,
  PostEditorRecord,
  PostListFields,
  PostRevision,
  PostStatus,
  PostTag,
  PostTagInput,
  PostTier,
  PostTierInput,
} from './content-types';

export interface PostsResponseType {
  meta?: Meta;
  posts: Post[];
}

export interface PostResponseType {
  meta?: Meta;
  posts: PostEditorRecord[];
}

const dataType = 'PostsResponseType';

export const postsDataType = dataType;

export const useBrowsePosts = createQuery<PostsResponseType>({
  dataType,
  path: '/posts/',
});

export const useBrowsePostsInfinite = createInfiniteQuery<PostsResponseType & { isEnd: boolean }>({
  dataType,
  path: '/posts/',
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
    const { pages } = originalData as InfiniteData<PostsResponseType>;
    const posts = pages.flatMap((page) => page.posts);
    const meta = pages[pages.length - 1].meta;

    return {
      posts,
      meta,
      isEnd: meta ? meta.pagination.pages === meta.pagination.page : true,
    };
  },
});

const usePostQuery = createQueryWithId<PostResponseType>({
  dataType,
  path: (id) => `/posts/${id}/`,
});

export const usePost = (id: string, options: Parameters<typeof usePostQuery>[1] = {}) => {
  const { searchParams, ...queryOptions } = options;
  return usePostQuery(id, {
    ...queryOptions,
    searchParams: { ...buildPostReadParams(), ...searchParams },
  });
};

const useEditorPostQuery = createQueryWithId<PostResponseType>({
  dataType,
  path: (id) => `/posts/${id}/`,
});

export const useEditorPost = (
  id: string,
  options: Parameters<typeof useEditorPostQuery>[1] = {},
) => {
  const { searchParams, ...queryOptions } = options;
  return useEditorPostQuery(id, {
    ...queryOptions,
    searchParams: { ...searchParams, ...buildPostEditorReadParams() },
  });
};

// The create endpoint only accepts include/formats/source - revision and
// email delivery options are update-only
export interface AddPostPayload {
  post: CreateContentData<PostEditableData>;
  options?: PostCreateOptions;
  /** False when the caller handles an expired session itself instead of leaving the page. */
  sessionExpiryRedirect?: boolean;
}

export interface EditPostPayload {
  post: EditContentData<PostEditableData>;
  options?: PostWriteOptions;
  /** False when the caller handles an expired session itself instead of leaving the page. */
  sessionExpiryRedirect?: boolean;
}

export const useAddPost = createMutation<PostResponseType, AddPostPayload>({
  method: 'POST',
  path: () => '/posts/',
  searchParams: ({ options }) => buildPostWriteParams(options),
  body: ({ post }) => ({ posts: [serializePostPayload(post)] }),
  requestOptions: ({ sessionExpiryRedirect }) => ({ sessionExpiryRedirect }),
  invalidateQueries: { dataType },
});

export const useEditPost = createMutation<PostResponseType, EditPostPayload>({
  method: 'PUT',
  path: ({ post }) => `/posts/${post.id}/`,
  searchParams: ({ options }) => buildPostWriteParams(options),
  body: ({ post }) => ({ posts: [serializePostPayload(post)] }),
  requestOptions: ({ sessionExpiryRedirect }) => ({ sessionExpiryRedirect }),
  invalidateQueries: { dataType },
});

export const useDeletePost = createMutation<unknown, string>({
  method: 'DELETE',
  path: (id) => `/posts/${id}/`,
});

/**
 * Bulk-edit posts matching an NQL filter.
 *
 * The filter is the point: after Cmd+A the selection is inverted and covers
 * posts that were never loaded, so the action has to be expressed as a query
 * rather than as a list of ids.
 */
export const useBulkEditPosts = createMutation<unknown, { filter: string; action: PostBulkAction }>(
  {
    method: 'PUT',
    path: () => '/posts/bulk/',
    searchParams: ({ filter }) => ({ filter }),
    body: ({ action }) => ({
      bulk: {
        action: action.type,
        meta: 'meta' in action ? action.meta : {},
      },
    }),
  },
);

/** Bulk-delete posts matching an NQL filter. */
export const useBulkDeletePosts = createMutation<unknown, { filter: string }>({
  method: 'DELETE',
  path: () => '/posts/',
  searchParams: ({ filter }) => ({ filter }),
});

/**
 * Duplicate a post. The copy is always a draft, whatever the source was, so
 * callers place it at the top of the list rather than beside its original.
 */
export const useCopyPost = createMutation<PostsResponseType, string>({
  method: 'POST',
  path: (id) => `/posts/${id}/copy/`,
});

export interface ImportContentCSVPayload {
  file: File;
  mapping: Record<string, string>;
}

export const useImportContentCSV = createMutation<unknown, ImportContentCSVPayload>({
  method: 'POST',
  retry: false,
  path: () => '/posts/upload/',
  body: ({ file, mapping }) => {
    const formData = new FormData();
    formData.append('postsfile', file);
    for (const [header, field] of Object.entries(mapping)) {
      formData.append(`mapping[${header}]`, field);
    }
    return formData;
  },
});
