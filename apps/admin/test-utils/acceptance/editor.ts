import type { QueryClient } from '@tanstack/react-query';
import { onTestFinished } from 'vitest';
import { postsDataType } from '@tryghost/admin-x-framework/api/posts';
import { buildLexicalParagraph, post, settingsResponse, type Post } from '@tryghost/test-data';
import type { RenderAdminAppOptions } from './render-admin-app';
import { fakeNewsletters, fakePosts, fakeSnippets } from './resources';
import { fakeAdminEndpoint, fakeEndpoint, type EndpointCapture } from './worker';

/** Supporting reads shared by the editor's header, card configuration and email size check. */
export function fakeEditorChrome(): void {
  fakeSnippets([]);
  fakePosts([]);
  fakeNewsletters([]);
  fakeEmailPreview();
}

/**
 * Renders any post's email as `bytes` bytes of HTML, a size the editor estimates
 * as it is. A later call replaces the earlier one.
 */
export function fakeEmailPreview(bytes = 1024): EndpointCapture {
  return fakeAdminEndpoint('GET', /^\/email_previews\/posts\/[^/]+\//, {
    email_previews: [{ html: 'a'.repeat(bytes), plaintext: '', subject: 'Hello from React' }],
  });
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

/**
 * Resolves once a read of `version` at its `updated_at` has landed in the query cache and the
 * editor has handled it; a read the editor refuses changes nothing on screen to wait for.
 */
export function editorReadLanded(
  queryClient: QueryClient,
  version: Pick<Post, 'id' | 'updated_at'>,
): Promise<void> {
  const cache = queryClient.getQueryCache();
  const landed = () =>
    cache.findAll({ queryKey: [postsDataType] }).some((query) => {
      const data = query.state.data as { posts?: Array<Pick<Post, 'updated_at'>> } | undefined;
      return (
        String(query.queryKey[1]).includes(`/posts/${version.id}/`) &&
        // A save writes its own answer into the entry while the read after it is in flight.
        query.state.fetchStatus === 'idle' &&
        data?.posts?.[0]?.updated_at === version.updated_at
      );
    });

  return new Promise((resolve) => {
    // The cache hears of a read before its observers, which it tells on its next timer turn.
    const handled = () => setTimeout(() => setTimeout(resolve));
    if (landed()) {
      handled();
      return;
    }
    const unsubscribe = cache.subscribe(() => {
      if (landed()) {
        unsubscribe();
        handled();
      }
    });
  });
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

// Long enough that no acceptance run reaches it, so a save that lands is one
// the editor sent without waiting for the debounce.
const NO_AUTOSAVE_MS = 600_000;
const FAST_AUTOSAVE_MS = 50;

/**
 * Boots the editor with a debounce no run reaches, so a debounced autosave cannot
 * be what a spec's assertion sees. The other two paths to a write are untouched:
 * the engine's 60s timed cycle still arms, and a post with no id still enqueues its
 * create straight away rather than waiting for the debounce.
 */
export function withoutAutosave(options: RenderAdminAppOptions = {}): RenderAdminAppOptions {
  return { ...options, autosaveDebounceMs: NO_AUTOSAVE_MS };
}

/** Boots the editor with autosave firing straight away, for specs whose subject is autosave. */
export function withFastAutosave(options: RenderAdminAppOptions = {}): RenderAdminAppOptions {
  return { ...options, autosaveDebounceMs: FAST_AUTOSAVE_MS };
}

/** The site fixture turns Unsplash on, so only the off case needs an override. */
export function withoutUnsplash(): RenderAdminAppOptions {
  return {
    boot: { browseSettings: { response: settingsResponse({ settings: { unsplash: false } }) } },
  };
}

// Data URLs, so neither the stylesheet link nor anything that reads them fetches.
const PINTURA_JS_URL = 'data:text/javascript,';
const PINTURA_CSS_URL = 'data:text/css,';

/** Boots a site with Pintura configured; `fakePintura()` stands in for its script. */
export function withPintura(): RenderAdminAppOptions {
  return {
    boot: {
      browseSettings: {
        response: settingsResponse({
          settings: {
            pintura: true,
            pintura_js_url: PINTURA_JS_URL,
            pintura_css_url: PINTURA_CSS_URL,
          },
        }),
      },
    },
  };
}

export interface FakePintura {
  /** The `src` of every image the editor was opened on. */
  opened: string[];
  /** Ends the open edit as Save and close does: hands `file` to the field, then closes. */
  save: (file: File) => void;
}

/**
 * Stands in for the script and stylesheet `withPintura()` configures, as already
 * loaded; both are removed again when the test finishes.
 */
export function fakePintura(): FakePintura {
  const opened: string[] = [];
  let process: ((result: { dest: File }) => void) | undefined;
  let destroyed: (() => void) | undefined;

  window.pintura = {
    openDefaultEditor: ({ src }) => {
      opened.push(src);
      return {
        on: (event, callback) => {
          if (event === 'process') {
            process = callback;
          }
          if (event === 'destroy') {
            destroyed = callback as () => void;
          }
        },
        destroy: () => {},
      };
    },
  };
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = PINTURA_CSS_URL;
  document.head.appendChild(link);

  onTestFinished(() => {
    link.remove();
    Reflect.deleteProperty(window, 'pintura');
  });

  return {
    opened,
    save: (file) => {
      process?.({ dest: file });
      destroyed?.();
    },
  };
}
