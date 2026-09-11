import { buildLexicalParagraph, post, settingsResponse, type Post } from '@tryghost/test-data';
import type { RenderAdminAppOptions } from './render-admin-app';
import { fakeNewsletters, fakePosts, fakeSnippets } from './resources';
import { fakeAdminEndpoint, fakeEndpoint, type EndpointCapture } from './worker';

/** Supporting reads shared by the editor's header and card configuration. */
export function fakeEditorChrome(): void {
  fakeSnippets([]);
  fakePosts([]);
  fakeNewsletters([]);
}

/** Saved fields are returned by later reads; each save advances the collision token. */
export function fakeEditorPost(
  overrides: Partial<Post> = {},
  normalize: (saved: Post) => Post = (saved) => saved,
): EndpointCapture {
  let current = post({
    id: 'abc123',
    title: 'Hello from React',
    slug: 'hello-from-react',
    status: 'draft',
    lexical: buildLexicalParagraph('Hello from React'),
    updated_at: '2026-01-01T00:00:00.000Z',
    published_at: null,
    ...overrides,
  });
  const route = new RegExp(`^/posts/${current.id}/\\?`);

  fakeAdminEndpoint('GET', route, () => ({ posts: [current] }));
  return fakeAdminEndpoint('PUT', route, ({ body }) => {
    const submitted = (body as { posts: Partial<Post>[] }).posts[0];
    current = normalize({
      ...current,
      ...submitted,
      updated_at: new Date(Date.parse(current.updated_at) + 1000).toISOString(),
    });
    return { posts: [current] };
  });
}

/** The submitted fields from a captured save, defaulting to the most recent request. */
export function submittedPost(capture: EndpointCapture, index = -1): Record<string, unknown> {
  const body = capture.requests.at(index)?.body as { posts: Record<string, unknown>[] } | undefined;
  return body?.posts[0] ?? {};
}

const UNSPLASH_REGULAR = 'https://images.unsplash.com/photo-1?ixid=1&w=1080';
// The picker asks Unsplash for a wider rendition of the image it inserts.
export const UNSPLASH_PICKED = 'https://images.unsplash.com/photo-1?ixid=1&w=2000';

/** One Unsplash photo, in the shape the search modal lays out and inserts. */
export function fakeUnsplashPhotos(): void {
  fakeEndpoint('GET', 'https://api.unsplash.com/photos', [
    {
      id: 'photo-1',
      color: '#123456',
      alt_description: 'A hillside',
      height: 800,
      width: 1200,
      likes: 12,
      urls: { regular: UNSPLASH_REGULAR },
      links: {
        html: 'https://unsplash.com/photos/photo-1',
        download: 'https://unsplash.com/photos/photo-1/download',
        download_location: 'https://api.unsplash.com/photos/photo-1/download',
      },
      user: {
        name: 'A Photographer',
        links: { html: 'https://unsplash.com/@photographer' },
        profile_image: { medium: 'https://images.unsplash.com/profile-1' },
      },
    },
  ]);
  fakeEndpoint('GET', 'https://api.unsplash.com/photos/photo-1/download', {});
}

/** The site fixture turns Unsplash on, so only the off case needs an override. */
export function withoutUnsplash(): RenderAdminAppOptions {
  return {
    boot: { browseSettings: { response: settingsResponse({ settings: { unsplash: false } }) } },
  };
}
