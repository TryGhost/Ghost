import { instance, responses } from './fixture';

const recordings: Record<string, { status: number; body: string }> = responses;
const firstPageUrl = Object.keys(recordings).find(
  (url) => new URL(url).searchParams.get('limit') === '25',
)!;
const relatedUrl = Object.keys(recordings).find((url) => new URL(url).searchParams.has('filter'))!;
export type RecordedPosts = {
  posts: Record<string, unknown>[];
  meta: {
    pagination: {
      page: number;
      limit: number;
      pages: number;
      total: number;
      next: number | null;
      prev: number | null;
    };
  };
};
export type FixtureDataSnapshot = 'recorded' | 'long-title';
export const REFRESHED_POST_TITLE =
  'A newly updated article about building a publication, finding an audience and making room for ambitious creative work';
const refreshedPostId = (JSON.parse(recordings[firstPageUrl].body) as RecordedPosts).posts[0].id;

/** Finite recorded first-page dataset, not a live API or arbitrary query simulator. */
export function recordedContentResponse(
  input: string,
  snapshot: FixtureDataSnapshot = 'recorded',
): Response {
  if (snapshot !== 'recorded' && snapshot !== 'long-title') {
    throw new Error('Unknown recorded content snapshot.');
  }
  const recorded = (body: string, status: number) => {
    if (snapshot === 'recorded') {
      return response(body, status);
    }
    const data = JSON.parse(body) as Partial<RecordedPosts>;
    if (Array.isArray(data.posts)) {
      data.posts = data.posts.map((post) =>
        post.id === refreshedPostId ? { ...post, title: REFRESHED_POST_TITLE } : post,
      );
      return response(JSON.stringify(data), status);
    }
    return response(body, status);
  };
  const exact = recordings[input];
  if (exact) {
    return recorded(exact.body, exact.status);
  }
  const url = new URL(input);
  const firstPage = new URL(firstPageUrl);
  const params = url.searchParams;
  const keys = [...params.keys()];
  if (
    url.origin !== firstPage.origin ||
    url.pathname !== firstPage.pathname ||
    keys.some(
      (key) =>
        !['key', 'include', 'limit', 'page', 'filter'].includes(key) ||
        params.getAll(key).length !== 1,
    ) ||
    params.get('key') !== instance.contentApiKey ||
    !['authors', 'authors,tags,tiers'].includes(params.get('include') ?? '') ||
    (params.has('page') && params.get('page') !== '1')
  ) {
    throw new Error(`No recorded Content API response for ${input}`);
  }
  // Source asks for authors on the same related-post query recorded by Casper.
  if (params.get('filter') === 'id:-null' && params.get('limit') === '4') {
    return recorded(recordings[relatedUrl].body, recordings[relatedUrl].status);
  }
  const limit = Number(params.get('limit'));
  if (params.has('filter') || !Number.isSafeInteger(limit) || limit < 1 || limit > 25) {
    throw new Error(`No recorded Content API response for ${input}`);
  }
  const body = JSON.parse(recordings[firstPageUrl].body) as RecordedPosts;
  body.posts = body.posts.slice(0, limit);
  const pagination = body.meta.pagination;
  pagination.limit = limit;
  pagination.pages = Math.ceil(pagination.total / limit);
  pagination.next = pagination.pages > 1 ? 2 : null;
  return recorded(JSON.stringify(body), recordings[firstPageUrl].status);
}

function response(body: string, status: number) {
  return new Response(body, { status, headers: { 'content-type': 'application/json' } });
}
