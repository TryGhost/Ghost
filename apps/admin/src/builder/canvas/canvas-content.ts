import { canvasPost } from './canvas-posts';
import type { CanvasContentKind, CanvasContentProvider } from './canvas-driver';

export const canvasContentKinds: CanvasContentKind[] = ['post', 'page', 'tag', 'author'];
export const canvasContentLabels: Record<CanvasContentKind, string> = {
  post: 'Post',
  page: 'Page',
  tag: 'Tag',
  author: 'Author',
};

/** Published route contexts only. Renderer routing, not the picker, resolves templates. */
export function createCanvasContent(
  kind: CanvasContentKind,
  siteUrl: string,
  key: string,
): Omit<CanvasContentProvider, 'selected'> {
  const resource = `${kind}s`;
  const request = async (path: string, signal: AbortSignal, page?: number) => {
    const url = new URL(`${siteUrl.replace(/\/$/, '')}/ghost/api/content/${resource}/${path}`);
    url.searchParams.set('key', key);
    url.searchParams.set(
      'fields',
      kind === 'tag' || kind === 'author' ? 'id,name,url' : 'id,title,url',
    );
    if (page !== undefined) {
      if (!Number.isSafeInteger(page) || page < 1 || page > 10000) {
        throw new Error('Choose a content page from 1 to 10000.');
      }
      url.searchParams.set('page', String(page));
      url.searchParams.set('limit', '20');
    }
    // eslint-disable-next-line no-restricted-syntax -- Public Content API supplies real renderer route contexts.
    const response = await fetch(url, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
      signal,
    });
    if (!response.ok) {
      throw new Error(`Could not load published ${resource}. Try loading again.`);
    }
    const payload = (await response.json()) as Record<string, unknown> & {
      meta?: { pagination?: { next?: unknown } };
    };
    const items = payload?.[resource];
    if (!Array.isArray(items) || items.length > 20) {
      throw new Error(`The site returned invalid published ${resource}.`);
    }
    return { items, next: payload.meta?.pagination?.next };
  };
  const parse = (item: unknown) => {
    const value = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    return canvasPost(
      { ...value, title: kind === 'tag' || kind === 'author' ? value.name : value.title },
      siteUrl,
    );
  };
  return {
    list: async (page, signal) => {
      const result = await request('', signal, page);
      if (
        result.next !== null &&
        (!Number.isSafeInteger(result.next) ||
          Number(result.next) <= page ||
          Number(result.next) > 10000)
      ) {
        throw new Error('The site returned invalid content pagination.');
      }
      return { posts: result.items.map(parse), nextPage: result.next as number | null };
    },
    read: async (id, signal) => {
      if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id)) {
        throw new Error('Choose discovered published content.');
      }
      const result = await request(`${encodeURIComponent(id)}/`, signal);
      if (result.items.length !== 1) {
        throw new Error('The selected content is no longer available.');
      }
      const item = parse(result.items[0]);
      if (item.id !== id) {
        throw new Error('The selected content is no longer available.');
      }
      return item;
    },
  };
}
