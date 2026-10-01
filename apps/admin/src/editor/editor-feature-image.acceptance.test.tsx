import { describe, expect, it, onTestFinished } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import {
  UNSPLASH_PICKED,
  currentRoute,
  fakeAdminEndpoint,
  fakeEditorChrome,
  fakeEditorPost,
  fakePintura,
  fakeUnsplashPhotos,
  post,
  renderAdminApp,
  submittedPost,
  withPintura,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';
import { deferred } from '@/utils/deferred';

const POST_ID = 'abc123';
const FLAG_ON = { labs: { editorReact: true } };
const LOADED_AT = '2026-01-01T00:00:00.000Z';
const UPLOADED = 'https://example.com/content/images/2026/09/hills.png';
const EXISTING = 'https://example.com/content/images/2026/09/coast.png';
const EDITED = 'https://example.com/content/images/2026/09/coast-edited.png';

const SAVE_POLL = { timeout: 10_000 };

type SavedPost = ReturnType<typeof post>;

function fakeSavablePost(overrides: Partial<SavedPost> = {}) {
  fakeEditorChrome();
  return fakeEditorPost({
    tags: [],
    feature_image: null,
    feature_image_alt: null,
    feature_image_caption: null,
    ...overrides,
  });
}

/** The analytics events sent while the test runs, by name. */
function trackedEvents(): string[] {
  const events: string[] = [];
  const previous = window.plausible;
  window.plausible = (eventName) => events.push(eventName);
  onTestFinished(() => {
    window.plausible = previous;
  });
  return events;
}

/**
 * The feature image above the post title: uploading one, describing it with
 * alt text, and captioning it. Every change reaches the post through the same
 * save engine the body uses.
 */
describe('Post editor feature image', () => {
  it.each([
    { orientation: 'portrait', width: 800, height: 1200 },
    { orientation: 'landscape', width: 1200, height: 800 },
  ])(
    'shows the full $orientation image at its original aspect ratio',
    async ({ width, height }) => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="purple"/></svg>`;
      fakeSavablePost({ feature_image: `data:image/svg+xml,${encodeURIComponent(svg)}` });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

      await expect.element(editorScreen.featureImage()).toBeVisible();
      const image = editorScreen.featureImage().element().querySelector('img')!;
      await expect.poll(() => image.naturalWidth).toBe(width);

      const imageBounds = image.getBoundingClientRect();
      const containerBounds = image.closest('[data-slot="image-upload"]')!.getBoundingClientRect();
      expect(imageBounds.height).toBeCloseTo((imageBounds.width * height) / width, 0);
      expect(containerBounds.height).toBeCloseTo(imageBounds.height, 0);
    },
  );

  it('saves an uploaded image as soon as it lands', async () => {
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
  });

  it('does not insert a dropped feature image into the post body', async () => {
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
  });

  it('saves alt text for the image', async () => {
    const saveApi = fakeSavablePost({ feature_image: UPLOADED });
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await editorScreen.featureImageAltToggle().click();
    await editorScreen.featureImageAltInput().fill('Rolling hills');

    await expect.poll(() => saveApi.requests.length, SAVE_POLL).toBeGreaterThan(0);
    await expect
      .poll(() => submittedPost(saveApi).feature_image_alt, SAVE_POLL)
      .toBe('Rolling hills');
    expect(submittedPost(saveApi)).toMatchObject({ feature_image: UPLOADED });
  });

  it('saves the caption once it loses focus', async () => {
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
  });

  it('opens a post whose caption carries markup without making it unsaved', async () => {
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
  });

  it('stages a feature image edit on a published post until it is saved explicitly', async () => {
    const saveApi = fakeSavablePost({
      feature_image: UPLOADED,
      status: 'published',
      published_at: '2026-01-01T00:00:00.000Z',
    });
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await editorScreen.featureImageAltToggle().click();
    await editorScreen.featureImageAltInput().fill('Rolling hills');

    // A published post's canvas edits wait for an explicit save.
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
  });

  it('holds a new image on a published post until Update, then sends it once', async () => {
    const saveApi = fakeSavablePost({
      status: 'published',
      published_at: '2026-01-01T00:00:00.000Z',
    });
    const uploadApi = fakeAdminEndpoint('POST', '/images/upload/', {
      images: [{ url: UPLOADED, ref: null }],
    });
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await expect.element(editorScreen.updateButton()).toBeDisabled();
    await userEvent.upload(
      editorScreen.featureImageInput().element(),
      new File(['image'], 'hills.png', { type: 'image/png' }),
    );

    await expect.poll(() => uploadApi.requests.length, SAVE_POLL).toBe(1);
    await expect.element(editorScreen.removeFeatureImage()).toBeVisible();
    await expect.element(editorScreen.updateButton()).toBeEnabled();
    expect(saveApi.requests).toHaveLength(0);

    await editorScreen.updateButton().click();

    await expect.poll(() => saveApi.requests.length, SAVE_POLL).toBe(1);
    expect(submittedPost(saveApi)).toMatchObject({
      id: POST_ID,
      status: 'published',
      feature_image: UPLOADED,
    });
  });

  it('saves an image picked from Unsplash with the credit it carries', async () => {
    const saveApi = fakeSavablePost();
    fakeUnsplashPhotos();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await expect.element(editorScreen.featureImageUnsplashButton()).toBeVisible();
    await editorScreen.featureImageUnsplashButton().click();
    await editorScreen.unsplashInsertImage().click();

    await expect.poll(() => saveApi.requests.length, SAVE_POLL).toBe(1);
    const saved = submittedPost(saveApi);
    expect(saved.feature_image).toBe(UNSPLASH_PICKED);
    // The photographer credit the picker hands over, as the caption stores it.
    expect(String(saved.feature_image_caption)).toContain('A Photographer');
    await expect.element(editorScreen.removeFeatureImage()).toBeVisible();
  });

  it('clears the alt text and caption along with the image', async () => {
    const saveApi = fakeSavablePost({
      feature_image:
        'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"/%3E',
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
  });

  it('stays in the editor when the upload finds no session', async () => {
    fakeSavablePost();
    const uploadApi = fakeAdminEndpoint(
      'POST',
      '/images/upload/',
      { errors: [{ type: 'UnauthorizedError', message: 'Authorization failed' }] },
      { status: 401 },
    );
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await expect.element(editorScreen.featureImage()).toBeVisible();
    await editorScreen.titleInput().fill('Brand New Name');
    await userEvent.upload(
      editorScreen.featureImageInput().element(),
      new File(['image'], 'hills.png', { type: 'image/png' }),
    );

    // A 401 mid-upload must not navigate away from work that is still unsaved.
    await expect.poll(() => uploadApi.requests.length, SAVE_POLL).toBe(1);
    await expect.element(editorScreen.titleInput()).toHaveValue('Brand New Name');
    expect(currentRoute()).toBe(`/editor/post/${POST_ID}`);
    await expect.element(editorScreen.featureImageInput()).toBeInTheDocument();
    await expect.element(page.getByText('Couldn’t upload the feature image.')).toBeVisible();
  });

  it('offers no edit while the site has no image editor', async () => {
    fakeSavablePost({ feature_image: EXISTING });
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await expect.element(editorScreen.removeFeatureImage()).toBeVisible();
    await expect(editorScreen.editFeatureImage()).toHaveCount(0);
  });

  it('saves the image edited in Pintura in place of the original', async () => {
    const pintura = fakePintura();
    const events = trackedEvents();
    const saveApi = fakeSavablePost({ feature_image: EXISTING });
    const uploadApi = fakeAdminEndpoint('POST', '/images/upload/', {
      images: [{ url: EDITED, ref: null }],
    });
    await renderAdminApp(`/editor/post/${POST_ID}`, { ...FLAG_ON, ...withPintura() });

    await editorScreen.editFeatureImage().click();
    expect(pintura.opened).toHaveLength(1);
    const opened = new URL(pintura.opened[0]);
    expect(`${opened.origin}${opened.pathname}`).toBe(EXISTING);
    expect(opened.searchParams.get('v')).toMatch(/^\d+$/);

    pintura.save(new File(['edited'], 'coast.png', { type: 'image/png' }));

    await expect.poll(() => uploadApi.requests.length, SAVE_POLL).toBe(1);
    await expect(saveApi).toHaveSavedFields({ feature_image: EDITED });
    await expect.poll(() => events).toContain('Image Edit Saved');
  });

  it('keeps the original and counts no saved edit when the edited image cannot upload', async () => {
    const pintura = fakePintura();
    const events = trackedEvents();
    const saveApi = fakeSavablePost({ feature_image: EXISTING });
    const uploadApi = fakeAdminEndpoint('POST', '/images/upload/', { errors: [] }, { status: 500 });
    await renderAdminApp(`/editor/post/${POST_ID}`, { ...FLAG_ON, ...withPintura() });

    await editorScreen.editFeatureImage().click();
    pintura.save(new File(['edited'], 'coast.png', { type: 'image/png' }));

    await expect.poll(() => uploadApi.requests.length, SAVE_POLL).toBe(1);
    await expect.element(page.getByText('Couldn’t upload the feature image.')).toBeVisible();
    expect(events).toContain('Image Edit Button Clicked');
    expect(events).not.toContain('Image Edit Saved');
    expect(saveApi.requests).toHaveLength(0);
    await expect.element(editorScreen.removeFeatureImage()).toBeEnabled();
    expect(editorScreen.featureImage().element().querySelector('img')?.src).toBe(EXISTING);
  });

  it('holds Remove and Edit while the edited image is uploading', async () => {
    const pintura = fakePintura();
    const uploaded = deferred<{ images: { url: string; ref: null }[] }>();
    const saveApi = fakeSavablePost({ feature_image: EXISTING });
    const uploadApi = fakeAdminEndpoint('POST', '/images/upload/', () => uploaded.promise);
    await renderAdminApp(`/editor/post/${POST_ID}`, { ...FLAG_ON, ...withPintura() });

    await editorScreen.editFeatureImage().click();
    pintura.save(new File(['edited'], 'coast.png', { type: 'image/png' }));

    try {
      await expect.poll(() => uploadApi.requests.length, SAVE_POLL).toBe(1);
      await expect.element(editorScreen.removeFeatureImage()).toBeDisabled();
      await expect.element(editorScreen.editFeatureImage()).toBeDisabled();
    } finally {
      uploaded.resolve({ images: [{ url: EDITED, ref: null }] });
    }

    await expect(saveApi).toHaveSavedFields({ feature_image: EDITED });
    await expect.element(editorScreen.removeFeatureImage()).toBeEnabled();
  });
});
