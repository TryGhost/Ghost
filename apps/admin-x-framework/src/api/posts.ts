import { InfiniteData } from '@tanstack/react-query';
import {
  Meta,
  createInfiniteQuery,
  createQuery,
  createQueryWithId,
  createMutation,
} from '../utils/api/hooks';

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
} & PostListFields;

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

export const getPost = createQueryWithId<PostsResponseType>({
  dataType,
  path: (id) => `/posts/${id}/`,
});

export const useDeletePost = createMutation<unknown, string>({
  method: 'DELETE',
  path: (id) => `/posts/${id}/`,
});

/**
 * Duplicate a post. The copy is always a draft, whatever the source was, so
 * callers place it at the top of the list rather than beside its original.
 */
export const useCopyPost = createMutation<PostsResponseType, string>({
    method: 'POST',
    path: id => `/posts/${id}/copy/`
});

export const useImportContentCSV = createMutation<unknown, File>({
  method: 'POST',
  retry: false,
  path: () => '/posts/upload/',
  body: (file) => {
    const formData = new FormData();
    formData.append('postsfile', file);
    return formData;
  },
});
