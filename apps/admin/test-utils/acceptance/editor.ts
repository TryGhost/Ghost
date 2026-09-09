import { buildLexicalParagraph, post, type Post } from '@tryghost/test-data';
import { fakeMembers, fakeNewsletters, fakePosts, fakeSnippets } from './resources';
import { fakeAdminEndpoint, type EndpointCapture } from './worker';

/** Supporting reads shared by the editor's header and card configuration. */
export function fakeEditorChrome(): void {
  fakeSnippets([]);
  fakePosts([]);
  fakeMembers([]);
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
