import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { buildLexicalParagraph } from '@tryghost/test-data';

import {
  fakeAdminEndpoint,
  fakePosts,
  fakeSnippets,
  post,
  renderAdminApp,
  type EndpointCapture,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';

const POST_ID = 'abc123';
const FLAG_ON = { labs: { editorReact: true } };
const LOADED_AT = '2026-01-01T00:00:00.000Z';
const UPLOADED = 'https://example.com/content/images/2026/09/hills.png';

// The autosave debounce is 3s, so these journeys outlast the default timeout.
const SLOW = 20_000;
const SAVE_POLL = { timeout: 10_000 };

type SavedPost = ReturnType<typeof post>;

function submittedPost(capture: EndpointCapture): Record<string, unknown> {
  const body = capture.lastRequest?.body as { posts: Record<string, unknown>[] };
  return body.posts[0];
}

function fakeSavablePost(overrides: Partial<SavedPost> = {}) {
  fakeSnippets([]);
  fakePosts([]);
  let current = post({
    id: POST_ID,
    title: 'Hello from React',
    slug: 'hello-from-react',
    status: 'draft',
    lexical: buildLexicalParagraph('Hello from React'),
    updated_at: LOADED_AT,
    published_at: null,
    tags: [],
    feature_image: null,
    feature_image_alt: null,
    feature_image_caption: null,
    ...overrides,
  });
  let saves = 0;

  fakeAdminEndpoint('GET', new RegExp(`^/posts/${POST_ID}/\\?`), () => ({ posts: [current] }));

  return fakeAdminEndpoint('PUT', new RegExp(`^/posts/${POST_ID}/\\?`), ({ body }) => {
    saves += 1;
    const submitted = (body as { posts: Partial<SavedPost>[] }).posts[0];
    current = { ...current, ...submitted, updated_at: `2026-01-01T00:00:0${saves}.000Z` };
    return { posts: [current] };
  });
}

/**
 * The feature image above the post title: uploading one, describing it with
 * alt text, and captioning it. Every change reaches the post through the same
 * save engine the body uses.
 */
describe('Post editor feature image', () => {
  it(
    'saves an uploaded image as soon as it lands',
    async () => {
      const saveApi = fakeSavablePost();
      const uploadApi = fakeAdminEndpoint('POST', '/images/upload/', {
        images: [{ url: UPLOADED, ref: null }],
      });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

      await expect.element(editorScreen.featureImage()).toBeVisible();
      await userEvent.upload(
        editorScreen.featureImageInput().element(),
        new File(['image'], 'hills.png', { type: 'image/png' }),
      );

      await expect.poll(() => uploadApi.requests.length, SAVE_POLL).toBe(1);
      await expect.poll(() => saveApi.requests.length, SAVE_POLL).toBe(1);
      expect(submittedPost(saveApi)).toMatchObject({
        id: POST_ID,
        title: 'Hello from React',
        status: 'draft',
        updated_at: LOADED_AT,
        feature_image: UPLOADED,
      });
      await expect.element(editorScreen.removeFeatureImage()).toBeVisible();
    },
    SLOW,
  );

  it(
    'does not insert a dropped feature image into the post body',
    async () => {
      const saveApi = fakeSavablePost();
      const uploadApi = fakeAdminEndpoint('POST', '/images/upload/', {
        images: [{ url: UPLOADED, ref: null }],
      });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

      await expect.element(editorScreen.featureImage()).toBeVisible();
      await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');

      const dropzone = editorScreen
        .featureImage()
        .element()
        .querySelector('[data-slot="image-upload-dropzone"]');
      expect(dropzone).not.toBeNull();

      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(new File(['image'], 'hills.png', { type: 'image/png' }));
      dropzone!.dispatchEvent(
        new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
          dataTransfer,
        }),
      );

      await expect.poll(() => uploadApi.requests.length, SAVE_POLL).toBe(1);
      await expect.poll(() => saveApi.requests.length, SAVE_POLL).toBe(1);

      const saved = submittedPost(saveApi);
      expect(saved.feature_image).toBe(UPLOADED);
      expect(saved.lexical).toBeTypeOf('string');
      expect(String(saved.lexical)).not.toContain('"type":"image"');
    },
    SLOW,
  );

  it(
    'saves alt text for the image',
    async () => {
      const saveApi = fakeSavablePost({ feature_image: UPLOADED });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

      await editorScreen.featureImageAltToggle().click();
      await editorScreen.featureImageAltInput().fill('Rolling hills');

      await expect.poll(() => saveApi.requests.length, SAVE_POLL).toBeGreaterThan(0);
      await expect
        .poll(() => submittedPost(saveApi).feature_image_alt, SAVE_POLL)
        .toBe('Rolling hills');
      expect(submittedPost(saveApi)).toMatchObject({ feature_image: UPLOADED });
    },
    SLOW,
  );

  it(
    'saves the caption once it loses focus',
    async () => {
      const saveApi = fakeSavablePost({ feature_image: UPLOADED });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

      await expect.element(editorScreen.featureImageCaption()).toBeVisible();
      await editorScreen.featureImageCaption().click();
      await userEvent.keyboard('Photo by me');

      // The caption has reached the editor, so a save would have been sent by now.
      await expect.element(editorScreen.featureImageCaption()).toHaveTextContent('Photo by me');
      await expect.poll(() => saveApi.requests.length).toBe(0);

      await editorScreen.titleInput().click();

      await expect.poll(() => saveApi.requests.length, SAVE_POLL).toBe(1);
      expect(submittedPost(saveApi)).toMatchObject({ id: POST_ID, feature_image: UPLOADED });
      // Lexical wraps typed text in a `white-space: pre-wrap` span; the
      // caption is stored as it serializes it.
      expect(String(submittedPost(saveApi).feature_image_caption)).toContain('Photo by me');
    },
    SLOW,
  );

  it(
    'opens a post whose caption carries markup without making it unsaved',
    async () => {
      const saveApi = fakeSavablePost({
        feature_image: UPLOADED,
        feature_image_caption: 'Photo by <a href="https://example.com/j">Jane</a>',
      });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

      // The caption editor has loaded and re-serialized what it was given.
      await expect.element(editorScreen.featureImageCaption()).toHaveTextContent('Photo by Jane');
      await editorScreen.titleInput().click();

      await expect.poll(() => saveApi.requests.length).toBe(0);
      await expect.element(editorScreen.status()).toHaveTextContent('Draft - Saved');
    },
    SLOW,
  );

  it(
    'stages a feature image edit on a published post until it is saved explicitly',
    async () => {
      const saveApi = fakeSavablePost({
        feature_image: UPLOADED,
        status: 'published',
        published_at: '2026-01-01T00:00:00.000Z',
      });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

      await editorScreen.featureImageAltToggle().click();
      await editorScreen.featureImageAltInput().fill('Rolling hills');

      // A published post's background saves are dropped: the sidebar stages
      // these edits until Update.
      await expect.element(editorScreen.featureImageAltInput()).toHaveValue('Rolling hills');
      await expect.poll(() => saveApi.requests.length).toBe(0);

      await userEvent.keyboard('{Meta>}s{/Meta}');

      await expect.poll(() => saveApi.requests.length, SAVE_POLL).toBe(1);
      expect(submittedPost(saveApi)).toMatchObject({
        id: POST_ID,
        status: 'published',
        feature_image: UPLOADED,
        feature_image_alt: 'Rolling hills',
      });
    },
    SLOW,
  );

  it(
    'clears the alt text and caption along with the image',
    async () => {
      const saveApi = fakeSavablePost({
        feature_image: UPLOADED,
        feature_image_alt: 'Rolling hills',
        feature_image_caption: 'Photo by me',
      });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

      await editorScreen.removeFeatureImage().click();

      await expect.poll(() => saveApi.requests.length, SAVE_POLL).toBe(1);
      expect(submittedPost(saveApi)).toMatchObject({
        feature_image: null,
        feature_image_alt: null,
        feature_image_caption: null,
      });
      await expect.element(editorScreen.featureImageInput()).toBeInTheDocument();
    },
    SLOW,
  );
});
