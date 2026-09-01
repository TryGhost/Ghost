import { InfiniteData } from '@tanstack/react-query';
import {
  Meta,
  createInfiniteQuery,
  createQuery,
  createQueryWithId,
  createMutation,
} from '../utils/api/hooks';
import { PostWriteOptions, buildPostWriteParams, serializePostPayload } from './post-contract';

export type Email = {
  opened_count: number;
  email_count: number;
  status?: string;
  track_opens?: boolean;
  track_clicks?: boolean;
};

// Every field optional: these are supertypes of the narrower author/tag shapes
// already declared around the analytics screens, so widening `Post` doesn't
// invalidate them. The list only reads names and slugs.
export type PostAuthor = {
  id?: string;
  name?: string;
  email?: string;
  slug?: string;
};

export type PostTag = {
  id?: string;
  name?: string;
  slug?: string;
  visibility?: string;
};

/**
 * Fields the list screens need on top of the analytics-shaped core. All
 * optional: the analytics endpoints don't return them, and the list gets them
 * from the server's default relations rather than an explicit `include`.
 */
export type PostListFields = {
  featured?: boolean;
  updated_at?: string;
  created_at?: string;
  excerpt?: string;
  custom_excerpt?: string;
  authors?: PostAuthor[];
  primary_author?: PostAuthor | null;
  tags?: PostTag[];
  primary_tag?: PostTag | null;
  tiers?: object[];
};

export type PostRevision = {
  id?: string;
  post_id?: string;
  lexical?: string | null;
  title?: string | null;
  feature_image?: string | null;
  custom_excerpt?: string | null;
  post_status?: string | null;
  reason?: string | null;
  created_at?: string;
  author?: PostAuthor | null;
};

/**
 * Fields the editor reads and writes on top of the list/analytics shape. All
 * optional: the analytics and list endpoints don't return most of them.
 */
export type PostEditorFields = {
  lexical?: string | null;
  mobiledoc?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  canonical_url?: string | null;
  custom_template?: string | null;
  codeinjection_head?: string | null;
  codeinjection_foot?: string | null;
  og_image?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  twitter_image?: string | null;
  twitter_title?: string | null;
  twitter_description?: string | null;
  email_subject?: string | null;
  feature_image_alt?: string | null;
  feature_image_caption?: string | null;
  // Read/written on pages only; the post payload never includes it
  show_title_and_feature_image?: boolean;
  visibility_filter?: string | null;
  post_revisions?: PostRevision[];
};

export type Post = {
  id: string;
  url: string;
  slug: string;
  title: string;
  visibility?: string;
  uuid: string;
  feature_image?: string;
  count?: {
    clicks?: number;
    positive_feedback?: number;
    negative_feedback?: number;
  };
  email?: Email;
  status?: string;
  published_at?: string;
  newsletter_id?: string;
  newsletter?: object;
  email_only?: boolean;
  email_segment?: string;
  email_recipient_filter?: string;
  send_email_when_published?: boolean;
  email_stats?: object;
} & PostListFields &
  PostEditorFields;

/**
 * Fields a client may set on a post. Server-owned fields are omitted; the
 * request contract additionally strips read-only relations (`email`,
 * `newsletter`, `post_revisions`, ...) at request time, so spreading a fetched
 * `Post` into an edit payload is safe.
 */
export type PostEditableData = Partial<
  Omit<
    Post,
    | 'id'
    | 'uuid'
    | 'url'
    | 'count'
    | 'email'
    | 'email_stats'
    | 'newsletter'
    | 'newsletter_id'
    | 'post_revisions'
    | 'send_email_when_published'
    | 'email_recipient_filter'
    | 'primary_author'
    | 'primary_tag'
    | 'created_at'
    | 'excerpt'
  >
>;

export interface PostsResponseType {
  meta?: Meta;
  posts: Post[];
}

const dataType = 'PostsResponseType';

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

export const usePost = createQueryWithId<PostsResponseType>({
  dataType,
  path: (id) => `/posts/${id}/`,
});

export interface AddPostPayload {
  post: PostEditableData;
  options?: PostWriteOptions;
}

export interface EditPostPayload {
  post: PostEditableData & { id: string };
  options?: PostWriteOptions;
}

export const useAddPost = createMutation<PostsResponseType, AddPostPayload>({
  method: 'POST',
  path: () => '/posts/',
  searchParams: ({ options }) => buildPostWriteParams(options),
  body: ({ post }) => ({ posts: [serializePostPayload(post)] }),
  invalidateQueries: { dataType },
});

export const useEditPost = createMutation<PostsResponseType, EditPostPayload>({
  method: 'PUT',
  path: ({ post }) => `/posts/${post.id}/`,
  searchParams: ({ options }) => buildPostWriteParams(options),
  body: ({ post }) => ({ posts: [serializePostPayload(post)] }),
  invalidateQueries: { dataType },
});

export const useDeletePost = createMutation<unknown, string>({
  method: 'DELETE',
  path: (id) => `/posts/${id}/`,
});

export type PostBulkAction =
  | { type: 'feature' }
  | { type: 'unfeature' }
  | { type: 'unpublish' }
  | { type: 'unschedule' }
  | { type: 'addTag'; meta: { tags: { id?: string; name: string; slug?: string }[] } }
  | { type: 'access'; meta: { visibility: string; tiers?: { id: string }[] } };

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
