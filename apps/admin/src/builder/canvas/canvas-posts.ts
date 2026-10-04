import type { CanvasPost, CanvasPostPage } from './canvas-driver';

export function canvasPost(value: unknown, siteUrl: string): CanvasPost {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('The published Post is unavailable.');
  }
  const post = value as Record<string, unknown>;
  if (
    typeof post.id !== 'string' ||
    !/^[a-zA-Z0-9_-]{1,64}$/.test(post.id) ||
    typeof post.title !== 'string' ||
    typeof post.url !== 'string' ||
    post.url.length > 8192
  ) {
    throw new Error('The published Post did not provide usable content.');
  }
  const url = new URL(post.url),
    site = new URL(siteUrl);
  const root = site.pathname.endsWith('/') ? site.pathname : `${site.pathname}/`;
  if (
    url.origin !== site.origin ||
    !url.pathname.startsWith(root) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error('The published Post URL is outside this site.');
  }
  return { id: post.id, title: post.title.slice(0, 512), url: url.href };
}

/** Public Content API discovery; credentials remain private to the loaded session. */
export function createCanvasPostContent(siteUrl: string, key: string) {
  const request = async (path: string, signal: AbortSignal, page?: number) => {
    const url = new URL(`${siteUrl.replace(/\/$/, '')}/ghost/api/content/posts/${path}`);
    url.searchParams.set('key', key);
    url.searchParams.set('fields', 'id,title,url');
    if (page !== undefined) {
      if (!Number.isSafeInteger(page) || page < 1 || page > 10000) {
        throw new Error('Choose a Post page from 1 to 10000.');
      }
      url.searchParams.set('page', String(page));
      url.searchParams.set('limit', '20');
    }
    // eslint-disable-next-line no-restricted-syntax -- Public Content API inputs to the browser theme renderer.
    const response = await fetch(url, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
      signal,
    });
    if (!response.ok) {
      throw new Error('Could not load published Posts. Try loading again.');
    }
    const payload = (await response.json()) as {
      posts?: unknown[];
      meta?: { pagination?: { next?: unknown } };
    };
    if (!Array.isArray(payload?.posts)) {
      throw new Error('The site returned invalid published Posts.');
    }
    return payload;
  };
  return {
    list: async (page: number, signal: AbortSignal): Promise<CanvasPostPage> => {
      const result = await request('', signal, page);
      if (result.posts!.length > 20) {
        throw new Error('The site returned too many Posts for one page.');
      }
      const next = result.meta?.pagination?.next;
      if (
        next !== null &&
        (!Number.isSafeInteger(next) || Number(next) <= page || Number(next) > 10000)
      ) {
        throw new Error('The site returned invalid Post pagination.');
      }
      return {
        posts: result.posts!.map((post) => canvasPost(post, siteUrl)),
        nextPage: next as number | null,
      };
    },
    read: async (id: string, signal: AbortSignal): Promise<CanvasPost> => {
      if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id)) {
        throw new Error('Choose a discovered published Post.');
      }
      const result = await request(`${encodeURIComponent(id)}/`, signal);
      if (result.posts!.length !== 1) {
        throw new Error('The selected Post is no longer available.');
      }
      const post = canvasPost(result.posts![0], siteUrl);
      if (post.id !== id) {
        throw new Error('The selected Post is no longer available.');
      }
      return post;
    },
  };
}
