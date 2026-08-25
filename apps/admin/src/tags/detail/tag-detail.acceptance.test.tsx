import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import { deferred } from '@/utils/deferred';
import {
  configResponse,
  currentRoute,
  fakeAdminEndpoint,
  fakeEndpoint,
  fakeTags,
  renderAdminApp,
  tag,
  type Tag,
} from '@test-utils/acceptance';
import { sidebarScreen } from '@/layout/sidebar.screen';
import { tagsScreen } from '@/tags/tags.screen';
import { tagDetailScreen } from './tag-detail.screen';

const FLAGS = { labs: { tagDetailsReact: true } };

/**
 * A working single-tag fake: the slug read serves the latest state and writes
 * update it, so the post-save refetch reflects what was saved — the shape a
 * real server has, which the screen's dirty tracking depends on.
 */
function fakeTagWorld(t: Tag) {
  let current = t;
  fakeAdminEndpoint('GET', new RegExp(`^/tags/slug/${t.slug}/`), () => ({ tags: [current] }));
  const saveApi = fakeAdminEndpoint('PUT', new RegExp(`^/tags/${t.id}/`), ({ body }) => {
    current = { ...current, ...(body as { tags: Partial<Tag>[] }).tags[0] };
    return { tags: [current] };
  });
  return saveApi;
}

describe('Tag detail (tagDetailsReact on)', () => {
  it('renders the seeded tag', async () => {
    const t = tag({ name: 'News', slug: 'news', description: 'All the news', count: { posts: 3 } });
    fakeTagWorld(t);
    await renderAdminApp(`/tags/${t.slug}`, FLAGS);

    await expect.element(tagDetailScreen.title()).toHaveTextContent('News');
    await expect.element(tagDetailScreen.internalBadge()).not.toBeInTheDocument();
    await expect.element(tagDetailScreen.nameInput()).toHaveValue('News');
    await expect.element(tagDetailScreen.slugInput()).toHaveValue('news');
    // The host comes from the site endpoint's `url` (config has no
    // blogUrl), scheme-stripped — never a bare `/tag/news/` path.
    await expect.element(tagDetailScreen.slugPreview()).toHaveTextContent('test.com/tag/news/');
    await expect.element(tagDetailScreen.descriptionInput()).toHaveValue('All the news');
    const coreDataCard = tagDetailScreen.coreDataCard();
    await expect.element(coreDataCard.getByLabelText('Name', { exact: true })).toBeVisible();
    await expect
      .element(coreDataCard.getByRole('button', { name: 'Accent color picker' }))
      .toBeVisible();
    await expect.element(coreDataCard.getByText('Tag image', { exact: true })).toBeVisible();
    await expect.element(coreDataCard.getByLabelText('Slug', { exact: true })).toBeVisible();
    await expect.element(coreDataCard.getByLabelText('Description', { exact: true })).toBeVisible();
    await tagDetailScreen.actionsButton().click();
    await expect.element(tagDetailScreen.viewPostsMenuItem()).toHaveAttribute('target', '_blank');
    await expect.element(tagDetailScreen.deleteTagMenuItem()).toBeVisible();
  });

  it('shows an internal badge after the name for internal tags', async () => {
    const t = tag({ name: '#News', slug: 'hash-news', visibility: 'internal' });
    fakeTagWorld(t);
    await renderAdminApp(`/tags/${t.slug}`, FLAGS);

    await expect.element(tagDetailScreen.title()).toHaveTextContent('#News');
    await expect.element(tagDetailScreen.internalBadge()).toHaveTextContent('INTERNAL');
  });

  it('shows metadata in Search, X card, and Facebook card tabs', async () => {
    const t = tag({ name: 'News', slug: 'news' });
    fakeTagWorld(t);
    await renderAdminApp(`/tags/${t.slug}`, FLAGS);

    const metadataCard = tagDetailScreen.metadataCard();
    const searchTab = metadataCard.getByRole('tab', { name: 'Search' });
    const xTab = metadataCard.getByRole('tab', { name: 'X card' });
    const facebookTab = metadataCard.getByRole('tab', { name: 'Facebook card' });

    await expect.element(metadataCard.getByText('Meta data', { exact: true })).toBeVisible();
    await expect
      .element(
        metadataCard.getByText('Extra content for search engines and social accounts.', {
          exact: true,
        }),
      )
      .toBeVisible();
    await expect.element(searchTab).toHaveAttribute('aria-selected', 'true');
    await expect.element(xTab).toHaveAttribute('aria-selected', 'false');
    await expect.element(facebookTab).toHaveAttribute('aria-selected', 'false');

    const metaTitle = tagDetailScreen.metaTitleInput();
    const searchPreview = tagDetailScreen.searchPreviewLabel();
    await expect.element(metaTitle).toBeVisible();
    expect(
      metaTitle.element().compareDocumentPosition(searchPreview.element()) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    await xTab.click();
    await expect.element(searchTab).toHaveAttribute('aria-selected', 'false');
    await expect.element(xTab).toHaveAttribute('aria-selected', 'true');
    await expect.element(tagDetailScreen.metaTitleInput()).not.toBeInTheDocument();
    const xTitle = tagDetailScreen.xTitleInput();
    const xPreview = tagDetailScreen.xPreviewLabel();
    await expect.element(xTitle).toBeVisible();
    expect(
      xTitle.element().compareDocumentPosition(xPreview.element()) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    await facebookTab.click();
    await expect.element(xTab).toHaveAttribute('aria-selected', 'false');
    await expect.element(facebookTab).toHaveAttribute('aria-selected', 'true');
    await expect.element(tagDetailScreen.xTitleInput()).not.toBeInTheDocument();
    const facebookTitle = tagDetailScreen.facebookTitleInput();
    const facebookPreview = tagDetailScreen.facebookPreviewLabel();
    await expect.element(facebookTitle).toBeVisible();
    expect(
      facebookTitle.element().compareDocumentPosition(facebookPreview.element()) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    const codeInjectionCard = tagDetailScreen.codeInjectionCard();
    const codeInjectionTrigger = tagDetailScreen.codeInjectionTrigger();
    await expect.element(codeInjectionTrigger).toHaveAttribute('aria-expanded', 'false');
    await expect.element(tagDetailScreen.headerEditor()).not.toBeInTheDocument();
    await expect.element(tagDetailScreen.footerEditor()).not.toBeInTheDocument();
    const coreDataCard = tagDetailScreen.coreDataCard();
    expect(
      coreDataCard.element().compareDocumentPosition(codeInjectionCard.element()) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      codeInjectionCard.element().compareDocumentPosition(metadataCard.element()) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('edits and saves tag code injection with CodeMirror', async () => {
    const head = '<script>\n    head();\n</script>';
    const foot = '<style>\n    .footer { display: block; }\n</style>';
    const t = tag({
      name: 'News',
      slug: 'news',
      codeinjection_head: head,
      codeinjection_foot: foot,
    });
    const saveApi = fakeTagWorld(t);
    await renderAdminApp(`/tags/${t.slug}`, FLAGS);

    await expect
      .element(tagDetailScreen.codeInjectionTrigger())
      .toHaveAttribute('aria-expanded', 'true');
    const headerEditor = tagDetailScreen.headerEditor();
    const footerEditor = tagDetailScreen.footerEditor();
    await expect.element(headerEditor).toBeVisible();
    await expect.element(footerEditor).toBeVisible();
    await expect.poll(() => (headerEditor.element() as HTMLElement).innerText).toBe(head);
    await expect.poll(() => (footerEditor.element() as HTMLElement).innerText).toBe(foot);

    const updatedHead = '<script>updatedHead();</script>';
    const updatedFoot = '<style>.footer { display: grid; }</style>';

    // Playwright manipulates contenteditable DOM directly when clearing,
    // which can race CodeMirror's document reconciliation. Clear through
    // CodeMirror's keyboard handling before filling the empty editor.
    await headerEditor.click();
    await userEvent.keyboard('{ControlOrMeta>}a{/ControlOrMeta}');
    await userEvent.keyboard('{Backspace}');
    await expect.poll(() => headerEditor.element().textContent).toBe('');
    await headerEditor.fill(updatedHead);
    await expect.poll(() => (headerEditor.element() as HTMLElement).innerText).toBe(updatedHead);

    await footerEditor.click();
    await userEvent.keyboard('{ControlOrMeta>}a{/ControlOrMeta}');
    await userEvent.keyboard('{Backspace}');
    await expect.poll(() => footerEditor.element().textContent).toBe('');
    await footerEditor.fill(updatedFoot);
    await expect.poll(() => (footerEditor.element() as HTMLElement).innerText).toBe(updatedFoot);
    await tagDetailScreen.saveButton().click();

    await expect.element(tagDetailScreen.savedButton()).toBeVisible();
    const saved = (saveApi.lastRequest?.body as { tags: Array<Record<string, unknown>> }).tags[0];
    expect(saved.codeinjection_head).toBe(updatedHead);
    expect(saved.codeinjection_foot).toBe(updatedFoot);
  });

  it('opens code injection when only the footer contains code', async () => {
    const t = tag({ name: 'News', slug: 'news', codeinjection_foot: '<script>footer();</script>' });
    fakeTagWorld(t);
    await renderAdminApp(`/tags/${t.slug}`, FLAGS);

    await expect
      .element(tagDetailScreen.codeInjectionTrigger())
      .toHaveAttribute('aria-expanded', 'true');
    await expect.element(tagDetailScreen.footerEditor()).toBeVisible();
  });

  it('keeps CodeMirror autocomplete visible in the code injection accordion', async () => {
    const t = tag({ name: 'News', slug: 'news' });
    fakeTagWorld(t);
    await renderAdminApp(`/tags/${t.slug}`, FLAGS);

    await tagDetailScreen.codeInjectionTrigger().click();
    const headerEditor = tagDetailScreen.headerEditor();
    // The HTML language (and with it the autocomplete source) loads lazily;
    // a `<` typed before it attaches would never open the tooltip. CodeMirror
    // stamps the content element once the language is configured.
    await expect.element(headerEditor).toHaveAttribute('data-language', 'html');
    await headerEditor.fill('<');

    await expect
      .poll(() => tagDetailScreen.autocompleteTooltipProbe())
      .toEqual({
        containerBackground: 'rgba(0, 0, 0, 0)',
        containerHeight: 0,
        hostParent: 'BODY',
        tooltipOnscreen: true,
        tooltipPosition: 'fixed',
      });
  });

  it('redirects to billing during a force upgrade', async () => {
    const config = configResponse(FLAGS);
    config.config.hostSettings = { forceUpgrade: true };

    await renderAdminApp('/tags/news', {
      ...FLAGS,
      boot: { browseConfig: { response: config } },
    });

    await expect.poll(currentRoute).toBe('/pro');
    await expect.element(tagDetailScreen.detail()).not.toBeInTheDocument();
  });

  it('offers Unsplash for an empty tag image', async () => {
    const t = tag({ name: 'News', slug: 'news', feature_image: null });
    fakeTagWorld(t);
    fakeEndpoint('GET', 'https://api.unsplash.com/photos', []);
    await renderAdminApp(`/tags/${t.slug}`, FLAGS);

    await tagDetailScreen.unsplashButton().click();

    await expect.element(tagDetailScreen.unsplashHeading()).toBeVisible();
  });

  it('does not treat an open image picker as a dirty tag', async () => {
    const t = tag({ name: 'News', slug: 'news', feature_image: null });
    fakeTags([t]);
    fakeTagWorld(t);
    fakeEndpoint('GET', 'https://api.unsplash.com/photos', []);
    await renderAdminApp(`/tags/${t.slug}`, FLAGS);

    await tagDetailScreen.unsplashButton().click();
    await expect.element(tagDetailScreen.unsplashHeading()).toBeVisible();

    const backLink = tagDetailScreen.backLinkElement();
    expect(backLink).not.toBeNull();
    backLink?.click();

    await expect.poll(currentRoute).toBe('/tags');
    await expect.element(tagDetailScreen.leaveConfirmationText()).not.toBeInTheDocument();
  });

  it('saves edits and reports the saved state', async () => {
    const t = tag({ name: 'News', slug: 'news', visibility: 'public' });
    const saveApi = fakeTagWorld(t);
    await renderAdminApp(`/tags/${t.slug}`, FLAGS);

    await tagDetailScreen.nameInput().fill('Renamed');
    await tagDetailScreen.saveButton().click();

    await expect.element(tagDetailScreen.savedButton()).toBeVisible();
    const saved = (saveApi.lastRequest?.body as { tags: Array<Record<string, unknown>> }).tags[0];
    expect(saved.name).toBe('Renamed');
    expect(saved.slug).toBe('news');
    // The name changed, so the payload re-derives visibility (Ember
    // `models/tag.js` recomputes it in `save()` whenever the name changed).
    expect(saved.visibility).toBe('public');
  });

  it('preserves whitespace in untouched fields on a clean save', async () => {
    const t = tag({
      name: 'News',
      slug: 'news',
      description: '\nImportant\n',
      meta_title: ' Meta title ',
    });
    const saveApi = fakeTagWorld(t);
    await renderAdminApp(`/tags/${t.slug}`, FLAGS);

    await tagDetailScreen.saveButton().click();

    await expect.element(tagDetailScreen.savedButton()).toBeVisible();
    const saved = (saveApi.lastRequest?.body as { tags: Array<Record<string, unknown>> }).tags[0];
    expect(saved.description).toBe('\nImportant\n');
    expect(saved.meta_title).toBe(' Meta title ');
  });

  it('guards edits made after a same-slug save', async () => {
    const t = tag({ name: 'News', slug: 'news', visibility: 'public' });
    fakeTags([t]);
    fakeTagWorld(t);
    await renderAdminApp(`/tags/${t.slug}`, FLAGS);

    await tagDetailScreen.nameInput().fill('Renamed');
    await tagDetailScreen.saveButton().click();
    await expect.element(tagDetailScreen.savedButton()).toBeVisible();

    await tagDetailScreen.descriptionInput().fill('A later edit');
    await tagDetailScreen.backLink().click();

    await expect.element(tagDetailScreen.leaveConfirmationText()).toBeVisible();
  });

  it('creates a tag from /tags/new, generating the slug from the name', async () => {
    const created = tag({ name: 'Weekly News', slug: 'weekly-news' });
    const createApi = fakeAdminEndpoint('POST', new RegExp('^/tags/'), { tags: [created] });
    fakeTagWorld(created);
    await renderAdminApp('/tags/new', FLAGS);

    await expect.element(tagDetailScreen.title()).toHaveTextContent('New tag');
    const nameInput = tagDetailScreen.nameInput();
    await expect.element(nameInput).toBeVisible();
    await userEvent.type(nameInput.element(), 'Weekly News');
    await expect.element(tagDetailScreen.slugInput()).toHaveValue('weekly-news');

    await tagDetailScreen.saveButton().click();

    // Ember replaces `/tags/new` with the saved tag's route after creating.
    await expect.poll(currentRoute).toBe('/tags/weekly-news');
    await expect.element(tagDetailScreen.savedButton()).toBeVisible();
    const sent = (createApi.lastRequest?.body as { tags: Array<Record<string, unknown>> }).tags[0];
    expect(sent.name).toBe('Weekly News');
    expect(sent.visibility).toBe('public');
  });

  it('shows validation errors instead of saving an invalid tag', async () => {
    const t = tag({ name: 'News', slug: 'news' });
    const saveApi = fakeTagWorld(t);
    await renderAdminApp(`/tags/${t.slug}`, FLAGS);

    await tagDetailScreen.nameInput().fill('');
    await tagDetailScreen.saveButton().click();

    const nameInput = tagDetailScreen.nameInput();
    const fieldError = tagDetailScreen.nameFieldError();
    await expect.element(fieldError).toHaveTextContent('You must specify a name for the tag.');
    await expect.element(nameInput).toHaveAttribute('aria-describedby', 'tag-name-error');
    expect(saveApi.requests.length).toBe(0);
  });

  it('waits for an image upload before allowing the tag to save', async () => {
    const t = tag({ name: 'News', slug: 'news', feature_image: null });
    const saveApi = fakeTagWorld(t);
    const pendingUpload = deferred<{ images: { url: string; ref: null }[] }>();
    const uploadApi = fakeAdminEndpoint('POST', '/images/upload/', () => pendingUpload.promise);
    await renderAdminApp(`/tags/${t.slug}`, FLAGS);

    const uploadInput = tagDetailScreen.uploadImageInput();
    await expect.element(uploadInput).toBeVisible();
    await userEvent.upload(
      uploadInput.element(),
      new File(['image'], 'tag.png', { type: 'image/png' }),
    );
    await expect.poll(() => uploadApi.requests.length).toBe(1);
    await expect.element(tagDetailScreen.saveButton()).toBeDisabled();
    await tagDetailScreen.actionsButton().click();
    await expect.element(tagDetailScreen.deleteTagMenuItem()).toBeDisabled();
    await userEvent.keyboard('{Escape}');
    await expect.element(tagDetailScreen.unsplashButton()).toBeDisabled();

    pendingUpload.resolve({ images: [{ url: 'https://example.com/tag.png', ref: null }] });
    await expect.element(tagDetailScreen.saveButton()).toBeEnabled();
    await tagDetailScreen.saveButton().click();

    await expect.element(tagDetailScreen.savedButton()).toBeVisible();
    const saved = (saveApi.lastRequest?.body as { tags: Array<Record<string, unknown>> }).tags[0];
    expect(saved.feature_image).toBe('https://example.com/tag.png');
  });

  it('rejects image formats that the legacy uploader does not support', async () => {
    const t = tag({ name: 'News', slug: 'news', feature_image: null });
    fakeTagWorld(t);
    await renderAdminApp(`/tags/${t.slug}`, FLAGS);

    await tagDetailScreen
      .uploadImageInput()
      .upload(new File(['image'], 'tag.bmp', { type: 'image/bmp' }));

    await expect
      .element(tagDetailScreen.errorText(/The image type you uploaded is not supported/))
      .toBeVisible();
  });

  it('shows the legacy message when an image exceeds the server limit', async () => {
    const t = tag({ name: 'News', slug: 'news', feature_image: null });
    fakeTagWorld(t);
    fakeAdminEndpoint('POST', '/images/upload/', null, { status: 413 });
    await renderAdminApp(`/tags/${t.slug}`, FLAGS);

    await tagDetailScreen
      .uploadImageInput()
      .upload(new File(['image'], 'tag.png', { type: 'image/png' }));

    await expect
      .element(
        tagDetailScreen.errorText(
          'The image you uploaded was larger than the maximum file size your server allows.',
        ),
      )
      .toBeVisible();
  });

  it('clears save state when navigating to another tag', async () => {
    const first = tag({ name: 'First', slug: 'first' });
    const second = tag({ name: 'Second', slug: 'second' });
    fakeTags([first, second]);
    fakeTagWorld(first);
    fakeTagWorld(second);
    await renderAdminApp(`/tags/${first.slug}`, FLAGS);

    await tagDetailScreen.saveButton().click();
    await expect.element(tagDetailScreen.savedButton()).toBeVisible();
    await tagDetailScreen.backLink().click();
    await tagsScreen.link('Second').click();

    await expect.element(tagDetailScreen.title()).toHaveTextContent('Second');
    await expect.element(tagDetailScreen.saveButton()).toBeVisible();
    await expect.element(tagDetailScreen.savedButton()).not.toBeInTheDocument();
  });

  it('does not allow deletion while a tag save is pending', async () => {
    const t = tag({ name: 'News', slug: 'news' });
    fakeAdminEndpoint('GET', new RegExp(`^/tags/slug/${t.slug}/`), { tags: [t] });
    const pendingSave = deferred<{ tags: Tag[] }>();
    const saveApi = fakeAdminEndpoint(
      'PUT',
      new RegExp(`^/tags/${t.id}/`),
      () => pendingSave.promise,
    );
    await renderAdminApp(`/tags/${t.slug}`, FLAGS);

    await tagDetailScreen.nameInput().fill('Renamed');
    await tagDetailScreen.saveButton().click();
    await expect.poll(() => saveApi.requests.length).toBe(1);
    await expect.element(tagDetailScreen.colorPickerButton()).toBeDisabled();

    await tagDetailScreen.actionsButton().click();
    await expect.element(tagDetailScreen.deleteTagMenuItem()).toBeDisabled();

    pendingSave.resolve({ tags: [{ ...t, name: 'Renamed' }] });
    await expect.element(tagDetailScreen.deleteTagMenuItem()).toBeEnabled();
  });

  it('includes an immediately typed accent color in a keyboard save', async () => {
    let current = tag({ name: 'News', slug: 'news', accent_color: '#112233' });
    fakeAdminEndpoint('GET', new RegExp(`^/tags/slug/${current.slug}/`), () => ({
      tags: [current],
    }));
    const pendingSave = deferred<{ tags: Tag[] }>();
    const saveApi = fakeAdminEndpoint('PUT', new RegExp(`^/tags/${current.id}/`), async () => {
      const response = await pendingSave.promise;
      current = response.tags[0];
      return response;
    });
    await renderAdminApp(`/tags/${current.slug}`, FLAGS);

    await tagDetailScreen.accentColorHexInput().fill('AABBCC');
    await userEvent.keyboard('{Meta>}s{/Meta}');
    await expect.poll(() => saveApi.requests.length).toBe(1);

    const savedPayload = (saveApi.lastRequest?.body as { tags: Array<Record<string, unknown>> })
      .tags[0];
    expect(savedPayload.accent_color).toBe('#AABBCC');
    pendingSave.resolve({ tags: [{ ...current, accent_color: '#AABBCC' }] });
    await expect.element(tagDetailScreen.savedButton()).toBeVisible();
  });

  it('uses the Shade color picker and includes its value in a keyboard save', async () => {
    let current = tag({ name: 'News', slug: 'news', accent_color: '#112233' });
    fakeAdminEndpoint('GET', new RegExp(`^/tags/slug/${current.slug}/`), () => ({
      tags: [current],
    }));
    const pendingSave = deferred<{ tags: Tag[] }>();
    const saveApi = fakeAdminEndpoint('PUT', new RegExp(`^/tags/${current.id}/`), async () => {
      const response = await pendingSave.promise;
      current = response.tags[0];
      return response;
    });
    await renderAdminApp(`/tags/${current.slug}`, FLAGS);

    await tagDetailScreen.colorPickerButton().click();
    await tagDetailScreen.pickerHexInput().fill('#AABBCC');
    await expect.element(tagDetailScreen.accentColorHexInput()).toHaveValue('AABBCC');

    await userEvent.keyboard('{Meta>}s{/Meta}');
    await expect.poll(() => saveApi.requests.length).toBe(1);

    const savedPayload = (saveApi.lastRequest?.body as { tags: Array<Record<string, unknown>> })
      .tags[0];
    expect(savedPayload.accent_color).toBe('#AABBCC');
    pendingSave.resolve({ tags: [{ ...current, accent_color: '#AABBCC' }] });
    await expect.element(tagDetailScreen.savedButton()).toBeVisible();
  });

  it('waits for a pending save before continuing navigation', async () => {
    let current = tag({ name: 'News', slug: 'news' });
    fakeTags([current]);
    fakeAdminEndpoint('GET', new RegExp(`^/tags/slug/${current.slug}/`), () => ({
      tags: [current],
    }));
    const pendingSave = deferred<{ tags: Tag[] }>();
    const saveApi = fakeAdminEndpoint('PUT', new RegExp(`^/tags/${current.id}/`), async () => {
      const response = await pendingSave.promise;
      current = response.tags[0];
      return response;
    });
    await renderAdminApp(`/tags/${current.slug}`, FLAGS);

    await tagDetailScreen.nameInput().fill('Renamed');
    await tagDetailScreen.saveButton().click();
    await expect.poll(() => saveApi.requests.length).toBe(1);
    await tagDetailScreen.backLink().click();

    await expect.element(tagDetailScreen.leaveConfirmationText()).not.toBeInTheDocument();
    await expect.poll(currentRoute).toBe('/tags/news');

    pendingSave.resolve({ tags: [{ ...current, name: 'Renamed' }] });
    await expect.poll(currentRoute).toBe('/tags');
  });

  it('keeps the requested destination when a pending create resolves', async () => {
    const created = tag({ name: 'Weekly News', slug: 'weekly-news' });
    fakeTags([]);
    const pendingCreate = deferred<{ tags: Tag[] }>();
    const createApi = fakeAdminEndpoint('POST', new RegExp('^/tags/'), () => pendingCreate.promise);
    await renderAdminApp('/tags/new', FLAGS);

    await tagDetailScreen.nameInput().fill('Weekly News');
    await tagDetailScreen.saveButton().click();
    await expect.poll(() => createApi.requests.length).toBe(1);
    await tagDetailScreen.backLink().click();

    await expect.element(tagDetailScreen.leaveConfirmationText()).not.toBeInTheDocument();
    pendingCreate.resolve({ tags: [created] });
    await expect.poll(currentRoute).toBe('/tags');
  });

  it('shows the corrective API context when saving fails validation', async () => {
    const t = tag({ name: 'News', slug: 'news' });
    fakeAdminEndpoint('GET', new RegExp(`^/tags/slug/${t.slug}/`), { tags: [t] });
    fakeAdminEndpoint(
      'PUT',
      new RegExp(`^/tags/${t.id}/`),
      {
        errors: [
          {
            code: null,
            context: 'X title cannot be longer than 300 characters.',
            details: null,
            ghostErrorCode: null,
            help: '',
            id: 'validation-error',
            message: 'Validation error, cannot edit tag.',
            property: 'twitter_title',
            type: 'ValidationError',
          },
        ],
      },
      { status: 422 },
    );
    await renderAdminApp(`/tags/${t.slug}`, FLAGS);

    await tagDetailScreen.nameInput().fill('Renamed');
    await tagDetailScreen.saveButton().click();

    await expect
      .element(tagDetailScreen.errorText('X title cannot be longer than 300 characters.'))
      .toBeVisible();
    await expect.element(tagDetailScreen.retryButton()).toBeVisible();
  });

  it('deletes the tag after confirming, reporting the posts it is used on', async () => {
    const t = tag({ name: 'News', slug: 'news', count: { posts: 3 } });
    fakeTags([t]);
    fakeTagWorld(t);
    const deleteApi = fakeAdminEndpoint('DELETE', new RegExp(`^/tags/${t.id}/`), null, {
      status: 204,
    });
    await renderAdminApp(`/tags/${t.slug}`, FLAGS);

    await tagDetailScreen.actionsButton().click();
    await tagDetailScreen.deleteTagMenuItem().click();

    await expect.element(tagDetailScreen.deleteConfirmationText()).toBeVisible();
    await expect.element(tagDetailScreen.deletePostsCount()).toHaveTextContent('3 posts');

    await tagDetailScreen.confirmDeleteButton().click();

    await expect.poll(currentRoute).toBe('/tags');
    expect(deleteApi.requests.length).toBe(1);
  });

  it('uses the current draft name in the delete confirmation', async () => {
    const t = tag({ name: 'News', slug: 'news' });
    fakeTagWorld(t);
    await renderAdminApp(`/tags/${t.slug}`, FLAGS);

    await tagDetailScreen.nameInput().fill('Draft name');
    await tagDetailScreen.actionsButton().click();
    await tagDetailScreen.deleteTagMenuItem().click();

    await expect
      .element(tagDetailScreen.deleteModal().getByText('Draft name', { exact: true }))
      .toBeVisible();
  });

  it('guards leaving with unsaved edits via the breadcrumb', async () => {
    const t = tag({ name: 'News', slug: 'news' });
    fakeTags([t]);
    fakeTagWorld(t);
    await renderAdminApp(`/tags/${t.slug}`, FLAGS);

    await tagDetailScreen.nameInput().fill('Renamed');
    await tagDetailScreen.backLink().click();

    // The dialog carries Ember's ConfirmUnsavedChangesModal copy.
    await expect.element(tagDetailScreen.leaveConfirmationText()).toBeVisible();
    await tagDetailScreen.stayButton().click();
    await expect.element(tagDetailScreen.nameInput()).toHaveValue('Renamed');

    await tagDetailScreen.backLink().click();
    await tagDetailScreen.leaveButton().click();
    await expect.poll(currentRoute).toBe('/tags');
  });
});

describe('Tag detail history guard', () => {
  it('confirms before the back button leaves a dirty tag opened from the list', async () => {
    const t = tag({ name: 'News', slug: 'news' });
    fakeTags([t]);
    fakeTagWorld(t);
    await renderAdminApp('/site', FLAGS);

    await sidebarScreen.navLink('Tags').click();
    await expect.poll(currentRoute).toBe('/tags');
    await tagsScreen.tagRows().getByRole('link', { name: 'News' }).click();
    await expect.poll(currentRoute).toBe('/tags/news');
    await tagDetailScreen.nameInput().fill('Renamed');
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve)));
    });

    window.history.back();

    await expect.element(tagDetailScreen.leaveConfirmationText()).toBeVisible();
    await tagDetailScreen.stayButton().click();
    await expect.poll(currentRoute).toBe('/tags/news');
    await expect.element(tagDetailScreen.nameInput()).toHaveValue('Renamed');

    window.history.back();
    await tagDetailScreen.leaveButton().click();
    await expect.poll(currentRoute).toBe('/tags');
  });
});

describe('Tag detail (tagDetailsReact off)', () => {
  // No tag fakes are declared in these tests on purpose: if the React screen
  // mounted it would fetch the tag and fail the spec as an unhandled request.
  it('defers /tags/:slug to Ember', async () => {
    await renderAdminApp('/tags/news');

    await expect.poll(currentRoute).toBe('/tags/news');
    await expect.element(tagDetailScreen.detail()).not.toBeInTheDocument();
  });

  it('defers /tags/new to Ember', async () => {
    await renderAdminApp('/tags/new');

    await expect.poll(currentRoute).toBe('/tags/new');
    await expect.element(tagDetailScreen.detail()).not.toBeInTheDocument();
  });
});
