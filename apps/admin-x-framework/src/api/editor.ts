import {Query} from '@tanstack/react-query';
import {createMutation, createQueryWithId} from '../utils/api/hooks';
import {Email} from './posts';

export type EditorResource = 'posts' | 'pages';

// Mirrors ALL_POST_INCLUDES in ghost/admin/app/adapters/post.js — the editor
// needs to explicitly request post_revisions which means specifying every
// other include option too. The pages endpoint silently drops the includes it
// doesn't support (email, newsletter, count.clicks), matching Ember's
// behavior of sending the same list for both resources.
export const EDITOR_POST_INCLUDES = [
    'tags',
    'authors',
    'authors.roles',
    'email',
    'tiers',
    'newsletter',
    'count.clicks',
    'post_revisions',
    'post_revisions.author'
].join(',');

export const EDITOR_POST_FORMATS = 'mobiledoc,lexical';

const editorSearchParams = {
    formats: EDITOR_POST_FORMATS,
    include: EDITOR_POST_INCLUDES
};

// Field names match the snake_case casing of the Admin API response

export type FullPostRole = {
    id: string;
    name: string;
};

export type FullPostAuthor = {
    id: string;
    name: string;
    slug: string;
    email?: string;
    profile_image?: string | null;
    roles?: FullPostRole[];
};

export type FullPostTag = {
    id: string;
    name: string;
    slug: string;
    visibility?: 'public' | 'internal';
};

export type FullPostTier = {
    id: string;
    name: string;
    slug?: string;
};

export type FullPostNewsletter = {
    id: string;
    name?: string;
    slug?: string;
    status?: string;
};

export type PostRevision = {
    id: string;
    post_id: string;
    lexical: string | null;
    title: string | null;
    feature_image: string | null;
    feature_image_alt: string | null;
    feature_image_caption: string | null;
    post_status: string | null;
    reason: string | null;
    created_at: string;
    author?: FullPostAuthor;
};

export type FullPost = {
    id: string;
    uuid: string;
    title: string;
    slug: string;
    url?: string;
    lexical: string | null;
    mobiledoc: string | null;
    status: string;
    visibility: string;
    tiers?: FullPostTier[];
    excerpt?: string | null;
    custom_excerpt: string | null;
    feature_image: string | null;
    feature_image_alt: string | null;
    feature_image_caption: string | null;
    featured: boolean;
    published_at: string | null;
    updated_at: string;
    created_at: string;
    custom_template: string | null;
    canonical_url: string | null;
    codeinjection_head: string | null;
    codeinjection_foot: string | null;
    og_image: string | null;
    og_title: string | null;
    og_description: string | null;
    twitter_image: string | null;
    twitter_title: string | null;
    twitter_description: string | null;
    meta_title: string | null;
    meta_description: string | null;
    email_only?: boolean;
    email_segment?: string | null;
    email_subject?: string | null;
    newsletter?: FullPostNewsletter | null;
    email?: Email | null;
    tags?: FullPostTag[];
    authors?: FullPostAuthor[];
    post_revisions?: PostRevision[];
    count?: {
        clicks?: number;
        positive_feedback?: number;
        negative_feedback?: number;
    };
    show_title_and_feature_image?: boolean;
};

export interface EditorPostsResponseType {
    posts: FullPost[];
}

export interface EditorPagesResponseType {
    pages: FullPost[];
}

// Mutations are resource-parameterized (posts|pages), so the response carries
// either key depending on the resource that was saved
export interface EditorResourceResponseType {
    posts?: FullPost[];
    pages?: FullPost[];
}

// The full-post editor queries share the list dataTypes so that editor data
// stays in sync with the posts/pages list caches (and the Ember state bridge
// mapping for `post`)
export const getEditorPost = createQueryWithId<EditorPostsResponseType>({
    dataType: 'PostsResponseType',
    path: id => `/posts/${id}/`,
    defaultSearchParams: editorSearchParams
});

export const getEditorPage = createQueryWithId<EditorPagesResponseType>({
    dataType: 'PagesResponseType',
    path: id => `/pages/${id}/`,
    defaultSearchParams: editorSearchParams
});

// Resource-parameterized mutations need to invalidate both list caches, same
// as the bulk operations in posts.ts (createMutation's `dataType` invalidation
// is static, so we use the filters form)
const invalidatePostsAndPages = {
    filters: {
        predicate: (query: Query) => ['PostsResponseType', 'PagesResponseType'].includes(query.queryKey[0] as string)
    }
};

export interface AddEditorPostPayload {
    post: Partial<FullPost>;
    resource?: EditorResource;
}

export const useAddEditorPost = createMutation<EditorResourceResponseType, AddEditorPostPayload>({
    method: 'POST',
    path: ({resource = 'posts'}) => `/${resource}/`,
    defaultSearchParams: editorSearchParams,
    body: ({post, resource = 'posts'}) => ({[resource]: [post]}),
    invalidateQueries: invalidatePostsAndPages
});

export interface EditEditorPostPayload {
    id: string;
    // updated_at is required for the API's update collision detection — a
    // stale value results in a 409 UpdateCollisionError
    post: Partial<FullPost> & {updated_at: string};
    resource?: EditorResource;
    // Asks the API to convert a mobiledoc post to lexical as part of the
    // save (mirrors Ember's adapterOptions.convertToLexical, which appends
    // the same query param in ghost/admin/app/adapters/post.js)
    convertToLexical?: boolean;
    // Email sending params for publish saves, mirroring Ember's
    // adapterOptions.newsletter/emailSegment (ghost/admin/app/adapters/post.js):
    // `newsletter` is the newsletter slug; `emailSegment` is the recipient
    // NQL filter. emailSegment is only sent alongside a newsletter, and the
    // everyone-filter is collapsed to 'all' exactly like the Ember adapter.
    newsletter?: string;
    emailSegment?: string;
}

export const useEditEditorPost = createMutation<EditorResourceResponseType, EditEditorPostPayload>({
    method: 'PUT',
    path: ({id, resource = 'posts'}) => `/${resource}/${id}/`,
    searchParams: ({convertToLexical, newsletter, emailSegment}) => {
        const params: Record<string, string> = {...editorSearchParams};
        if (convertToLexical) {
            params.convert_to_lexical = '1';
        }
        if (newsletter) {
            params.newsletter = newsletter;
            if (emailSegment) {
                params.email_segment = emailSegment === 'status:free,status:-free' ? 'all' : emailSegment;
            }
        }
        return params;
    },
    body: ({post, resource = 'posts'}) => ({[resource]: [post]}),
    invalidateQueries: invalidatePostsAndPages
});
