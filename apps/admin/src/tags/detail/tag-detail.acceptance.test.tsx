import {describe, expect, it} from 'vitest';
import {page, userEvent} from 'vitest/browser';

import {deferred} from '@/utils/deferred';
import {configResponse, currentRoute, fakeAdminEndpoint, fakeEndpoint, fakeTags, renderAdminApp, tag, type Tag} from '@test-utils/acceptance';

const FLAGS = {labs: {tagDetailsReact: true}};

/**
 * A working single-tag fake: the slug read serves the latest state and writes
 * update it, so the post-save refetch reflects what was saved — the shape a
 * real server has, which the screen's dirty tracking depends on.
 */
function fakeTagWorld(t: Tag) {
    let current = t;
    fakeAdminEndpoint('GET', new RegExp(`^/tags/slug/${t.slug}/`), () => ({tags: [current]}));
    const saveApi = fakeAdminEndpoint('PUT', new RegExp(`^/tags/${t.id}/`), ({body}) => {
        current = {...current, ...(body as {tags: Partial<Tag>[]}).tags[0]};
        return {tags: [current]};
    });
    return saveApi;
}

describe('Tag detail (tagDetailsReact on)', () => {
    it('renders the seeded tag', async () => {
        const t = tag({name: 'News', slug: 'news', description: 'All the news', count: {posts: 3}});
        fakeTagWorld(t);
        await renderAdminApp(`/tags/${t.slug}`, FLAGS);

        await expect.element(page.getByTestId('tag-detail-title')).toHaveTextContent('News');
        await expect.element(page.getByLabelText('Name', {exact: true})).toHaveValue('News');
        await expect.element(page.getByLabelText('Slug', {exact: true})).toHaveValue('news');
        // The host comes from the site endpoint's `url` (config has no
        // blogUrl), scheme-stripped — never a bare `/tag/news/` path.
        await expect.element(page.getByTestId('tag-slug-preview')).toHaveTextContent('test.com/tag/news/');
        await expect.element(page.getByLabelText('Description', {exact: true})).toHaveValue('All the news');
        await expect.element(page.getByRole('button', {name: 'Delete tag', exact: true})).toBeVisible();
    });

    it('edits and saves tag code injection with CodeMirror', async () => {
        const head = '<script>\n    head();\n</script>';
        const foot = '<style>\n    .footer { display: block; }\n</style>';
        const t = tag({name: 'News', slug: 'news', codeinjection_head: head, codeinjection_foot: foot});
        const saveApi = fakeTagWorld(t);
        await renderAdminApp(`/tags/${t.slug}`, FLAGS);

        await page.getByRole('button', {name: /Code injection/}).click();
        const headerEditor = page.getByRole('textbox', {name: /^Tag header/});
        const footerEditor = page.getByRole('textbox', {name: /^Tag footer/});
        await expect.element(headerEditor).toBeVisible();
        await expect.element(footerEditor).toBeVisible();
        await expect.poll(() => (headerEditor.element() as HTMLElement).innerText).toBe(head);
        await expect.poll(() => (footerEditor.element() as HTMLElement).innerText).toBe(foot);

        await headerEditor.fill('<script>updatedHead();</script>');
        await footerEditor.fill('<style>.footer { display: grid; }</style>');
        await page.getByRole('button', {name: 'Save'}).click();

        await expect.element(page.getByRole('button', {name: 'Saved'})).toBeVisible();
        const saved = (saveApi.lastRequest?.body as {tags: Array<Record<string, unknown>>}).tags[0];
        expect(saved.codeinjection_head).toBe('<script>updatedHead();</script>');
        expect(saved.codeinjection_foot).toBe('<style>.footer { display: grid; }</style>');
    });

    it('keeps CodeMirror autocomplete outside the clipped editor surface', async () => {
        const t = tag({name: 'News', slug: 'news'});
        fakeTagWorld(t);
        await renderAdminApp(`/tags/${t.slug}`, FLAGS);

        await page.getByRole('button', {name: /Code injection/}).click();
        await new Promise((resolve) => {
            window.setTimeout(resolve, 250);
        });
        const headerEditor = page.getByRole('textbox', {name: /^Tag header/});
        await headerEditor.fill('<');

        await new Promise((resolve) => {
            window.setTimeout(resolve, 75);
        });

        await expect.poll(() => {
            const tooltip = document.querySelector<HTMLElement>('.cm-tooltip-autocomplete');
            const tooltipParent = tooltip?.closest<HTMLElement>('.cm-tooltip-parent');
            const container = tooltipParent?.firstElementChild as HTMLElement | null;
            const editor = headerEditor.element().closest<HTMLElement>('[data-testid="codeinjection-head"]');

            if (!tooltip || !tooltipParent || !container || !editor) {
                return null;
            }

            const tooltipRect = tooltip.getBoundingClientRect();
            const editorRect = editor.getBoundingClientRect();

            return {
                containerBackground: getComputedStyle(container).backgroundColor,
                containerHeight: container.getBoundingClientRect().height,
                escapesEditor: tooltipRect.bottom > editorRect.bottom || tooltipRect.top < editorRect.top,
                hostParent: tooltipParent.parentElement?.tagName,
                tooltipOnscreen: tooltipRect.bottom > 0
                    && tooltipRect.right > 0
                    && tooltipRect.top < window.innerHeight
                    && tooltipRect.left < window.innerWidth,
                tooltipPosition: getComputedStyle(tooltip).position
            };
        }).toEqual({
            containerBackground: 'rgba(0, 0, 0, 0)',
            containerHeight: 0,
            escapesEditor: true,
            hostParent: 'BODY',
            tooltipOnscreen: true,
            tooltipPosition: 'fixed'
        });
    });

    it('redirects to billing during a force upgrade', async () => {
        const config = configResponse(FLAGS);
        config.config.hostSettings = {forceUpgrade: true};

        await renderAdminApp('/tags/news', {
            ...FLAGS,
            boot: {browseConfig: {response: config}}
        });

        await expect.poll(currentRoute).toBe('/pro');
        expect(page.getByTestId('tag-detail').query()).toBeNull();
    });

    it('offers Unsplash for an empty tag image', async () => {
        const t = tag({name: 'News', slug: 'news', feature_image: null});
        fakeTagWorld(t);
        fakeEndpoint('GET', 'https://api.unsplash.com/photos', []);
        await renderAdminApp(`/tags/${t.slug}`, FLAGS);

        await page.getByRole('button', {name: 'Select tag image from Unsplash'}).click();

        await expect.element(page.getByRole('heading', {name: 'Unsplash'})).toBeVisible();
    });

    it('does not treat an open image picker as a dirty tag', async () => {
        const t = tag({name: 'News', slug: 'news', feature_image: null});
        fakeTags([t]);
        fakeTagWorld(t);
        fakeEndpoint('GET', 'https://api.unsplash.com/photos', []);
        await renderAdminApp(`/tags/${t.slug}`, FLAGS);

        await page.getByRole('button', {name: 'Select tag image from Unsplash'}).click();
        await expect.element(page.getByRole('heading', {name: 'Unsplash'})).toBeVisible();

        const backLink = document.querySelector<HTMLAnchorElement>('[data-test-link="tags-back"]');
        expect(backLink).not.toBeNull();
        backLink?.click();

        await expect.poll(currentRoute).toBe('/tags');
        expect(page.getByText('Are you sure you want to leave this page?').query()).toBeNull();
    });

    it('saves edits and reports the saved state', async () => {
        const t = tag({name: 'News', slug: 'news', visibility: 'public'});
        const saveApi = fakeTagWorld(t);
        await renderAdminApp(`/tags/${t.slug}`, FLAGS);

        await page.getByLabelText('Name', {exact: true}).fill('Renamed');
        await page.getByRole('button', {name: 'Save'}).click();

        await expect.element(page.getByRole('button', {name: 'Saved'})).toBeVisible();
        const saved = (saveApi.lastRequest?.body as {tags: Array<Record<string, unknown>>}).tags[0];
        expect(saved.name).toBe('Renamed');
        expect(saved.slug).toBe('news');
        // The name changed, so the payload re-derives visibility (Ember
        // `models/tag.js` recomputes it in `save()` whenever the name changed).
        expect(saved.visibility).toBe('public');
    });

    it('preserves whitespace in untouched fields on a clean save', async () => {
        const t = tag({name: 'News', slug: 'news', description: '\nImportant\n', meta_title: ' Meta title '});
        const saveApi = fakeTagWorld(t);
        await renderAdminApp(`/tags/${t.slug}`, FLAGS);

        await page.getByRole('button', {name: 'Save'}).click();

        await expect.element(page.getByRole('button', {name: 'Saved'})).toBeVisible();
        const saved = (saveApi.lastRequest?.body as {tags: Array<Record<string, unknown>>}).tags[0];
        expect(saved.description).toBe('\nImportant\n');
        expect(saved.meta_title).toBe(' Meta title ');
    });

    it('guards edits made after a same-slug save', async () => {
        const t = tag({name: 'News', slug: 'news', visibility: 'public'});
        fakeTags([t]);
        fakeTagWorld(t);
        await renderAdminApp(`/tags/${t.slug}`, FLAGS);

        await page.getByLabelText('Name', {exact: true}).fill('Renamed');
        await page.getByRole('button', {name: 'Save'}).click();
        await expect.element(page.getByRole('button', {name: 'Saved'})).toBeVisible();

        await page.getByLabelText('Description', {exact: true}).fill('A later edit');
        await page.getByTestId('tag-detail').getByRole('link', {name: 'Tags'}).click();

        await expect.element(page.getByText('Are you sure you want to leave this page?')).toBeVisible();
    });

    it('creates a tag from /tags/new, generating the slug from the name', async () => {
        const created = tag({name: 'Weekly News', slug: 'weekly-news'});
        const createApi = fakeAdminEndpoint('POST', new RegExp('^/tags/'), {tags: [created]});
        fakeTagWorld(created);
        await renderAdminApp('/tags/new', FLAGS);

        await expect.element(page.getByTestId('tag-detail-title')).toHaveTextContent('New tag');
        const nameInput = page.getByLabelText('Name', {exact: true});
        await expect.element(nameInput).toBeVisible();
        await userEvent.type(nameInput.element(), 'Weekly News');
        await expect.element(page.getByLabelText('Slug', {exact: true})).toHaveValue('weekly-news');

        await page.getByRole('button', {name: 'Save'}).click();

        // Ember replaces `/tags/new` with the saved tag's route after creating.
        await expect.poll(currentRoute).toBe('/tags/weekly-news');
        await expect.element(page.getByRole('button', {name: 'Saved'})).toBeVisible();
        const sent = (createApi.lastRequest?.body as {tags: Array<Record<string, unknown>>}).tags[0];
        expect(sent.name).toBe('Weekly News');
        expect(sent.visibility).toBe('public');
    });

    it('shows validation errors instead of saving an invalid tag', async () => {
        const t = tag({name: 'News', slug: 'news'});
        const saveApi = fakeTagWorld(t);
        await renderAdminApp(`/tags/${t.slug}`, FLAGS);

        await page.getByLabelText('Name', {exact: true}).fill('');
        await page.getByRole('button', {name: 'Save'}).click();

        const nameInput = page.getByLabelText('Name', {exact: true});
        const fieldError = page.elementLocator(document.getElementById('tag-name-error')!);
        await expect.element(fieldError).toHaveTextContent('You must specify a name for the tag.');
        await expect.element(nameInput).toHaveAttribute('aria-describedby', 'tag-name-error');
        expect(saveApi.requests.length).toBe(0);
    });

    it('waits for an image upload before allowing the tag to save', async () => {
        const t = tag({name: 'News', slug: 'news', feature_image: null});
        const saveApi = fakeTagWorld(t);
        const pendingUpload = deferred<{images: {url: string; ref: null}[]}>();
        const uploadApi = fakeAdminEndpoint('POST', '/images/upload/', () => pendingUpload.promise);
        await renderAdminApp(`/tags/${t.slug}`, FLAGS);

        const uploadInput = page.getByLabelText('Upload tag image');
        await expect.element(uploadInput).toBeVisible();
        await userEvent.upload(uploadInput.element(), new File(['image'], 'tag.png', {type: 'image/png'}));
        await expect.poll(() => uploadApi.requests.length).toBe(1);
        await expect.element(page.getByRole('button', {name: 'Save'})).toBeDisabled();
        await expect.element(page.getByRole('button', {name: 'Delete tag'})).toBeDisabled();
        await expect.element(page.getByRole('button', {name: 'Select tag image from Unsplash'})).toBeDisabled();

        pendingUpload.resolve({images: [{url: 'https://example.com/tag.png', ref: null}]});
        await expect.element(page.getByRole('button', {name: 'Save'})).toBeEnabled();
        await page.getByRole('button', {name: 'Save'}).click();

        await expect.element(page.getByRole('button', {name: 'Saved'})).toBeVisible();
        const saved = (saveApi.lastRequest?.body as {tags: Array<Record<string, unknown>>}).tags[0];
        expect(saved.feature_image).toBe('https://example.com/tag.png');
    });

    it('rejects image formats that the legacy uploader does not support', async () => {
        const t = tag({name: 'News', slug: 'news', feature_image: null});
        fakeTagWorld(t);
        await renderAdminApp(`/tags/${t.slug}`, FLAGS);

        await page.getByLabelText('Upload tag image').upload(new File(['image'], 'tag.bmp', {type: 'image/bmp'}));

        await expect.element(page.getByText(/The image type you uploaded is not supported/)).toBeVisible();
    });

    it('shows the legacy message when an image exceeds the server limit', async () => {
        const t = tag({name: 'News', slug: 'news', feature_image: null});
        fakeTagWorld(t);
        fakeAdminEndpoint('POST', '/images/upload/', null, {status: 413});
        await renderAdminApp(`/tags/${t.slug}`, FLAGS);

        await page.getByLabelText('Upload tag image').upload(new File(['image'], 'tag.png', {type: 'image/png'}));

        await expect.element(page.getByText('The image you uploaded was larger than the maximum file size your server allows.')).toBeVisible();
    });

    it('clears save state when navigating to another tag', async () => {
        const first = tag({name: 'First', slug: 'first'});
        const second = tag({name: 'Second', slug: 'second'});
        fakeTags([first, second]);
        fakeTagWorld(first);
        fakeTagWorld(second);
        await renderAdminApp(`/tags/${first.slug}`, FLAGS);

        await page.getByRole('button', {name: 'Save'}).click();
        await expect.element(page.getByRole('button', {name: 'Saved'})).toBeVisible();
        await page.getByTestId('tag-detail').getByRole('link', {name: 'Tags'}).click();
        await page.getByRole('link', {name: 'Second', exact: true}).click();

        await expect.element(page.getByTestId('tag-detail-title')).toHaveTextContent('Second');
        await expect.element(page.getByRole('button', {name: 'Save', exact: true})).toBeVisible();
        expect(page.getByRole('button', {name: 'Saved'}).query()).toBeNull();
    });

    it('does not allow deletion while a tag save is pending', async () => {
        const t = tag({name: 'News', slug: 'news'});
        fakeAdminEndpoint('GET', new RegExp(`^/tags/slug/${t.slug}/`), {tags: [t]});
        const pendingSave = deferred<{tags: Tag[]}>();
        const saveApi = fakeAdminEndpoint('PUT', new RegExp(`^/tags/${t.id}/`), () => pendingSave.promise);
        await renderAdminApp(`/tags/${t.slug}`, FLAGS);

        await page.getByLabelText('Name', {exact: true}).fill('Renamed');
        await page.getByRole('button', {name: 'Save'}).click();
        await expect.poll(() => saveApi.requests.length).toBe(1);

        await expect.element(page.getByRole('button', {name: 'Delete tag'})).toBeDisabled();

        pendingSave.resolve({tags: [{...t, name: 'Renamed'}]});
        await expect.element(page.getByRole('button', {name: 'Delete tag'})).toBeEnabled();
    });

    it('includes an immediately typed accent color in a keyboard save', async () => {
        let current = tag({name: 'News', slug: 'news', accent_color: '#112233'});
        fakeAdminEndpoint('GET', new RegExp(`^/tags/slug/${current.slug}/`), () => ({tags: [current]}));
        const pendingSave = deferred<{tags: Tag[]}>();
        const saveApi = fakeAdminEndpoint('PUT', new RegExp(`^/tags/${current.id}/`), async () => {
            const response = await pendingSave.promise;
            current = response.tags[0];
            return response;
        });
        await renderAdminApp(`/tags/${current.slug}`, FLAGS);

        await page.getByLabelText('Accent color hex value').fill('AABBCC');
        await userEvent.keyboard('{Meta>}s{/Meta}');
        await expect.poll(() => saveApi.requests.length).toBe(1);

        const savedPayload = (saveApi.lastRequest?.body as {tags: Array<Record<string, unknown>>}).tags[0];
        expect(savedPayload.accent_color).toBe('#AABBCC');
        pendingSave.resolve({tags: [{...current, accent_color: '#AABBCC'}]});
        await expect.element(page.getByRole('button', {name: 'Saved'})).toBeVisible();
    });

    it('waits for a pending save before continuing navigation', async () => {
        let current = tag({name: 'News', slug: 'news'});
        fakeTags([current]);
        fakeAdminEndpoint('GET', new RegExp(`^/tags/slug/${current.slug}/`), () => ({tags: [current]}));
        const pendingSave = deferred<{tags: Tag[]}>();
        const saveApi = fakeAdminEndpoint('PUT', new RegExp(`^/tags/${current.id}/`), async () => {
            const response = await pendingSave.promise;
            current = response.tags[0];
            return response;
        });
        await renderAdminApp(`/tags/${current.slug}`, FLAGS);

        await page.getByLabelText('Name', {exact: true}).fill('Renamed');
        await page.getByRole('button', {name: 'Save'}).click();
        await expect.poll(() => saveApi.requests.length).toBe(1);
        await page.getByTestId('tag-detail').getByRole('link', {name: 'Tags'}).click();

        expect(page.getByText('Are you sure you want to leave this page?').query()).toBeNull();
        await expect.poll(currentRoute).toBe('/tags/news');

        pendingSave.resolve({tags: [{...current, name: 'Renamed'}]});
        await expect.poll(currentRoute).toBe('/tags');
    });

    it('keeps the requested destination when a pending create resolves', async () => {
        const created = tag({name: 'Weekly News', slug: 'weekly-news'});
        fakeTags([]);
        const pendingCreate = deferred<{tags: Tag[]}>();
        const createApi = fakeAdminEndpoint('POST', new RegExp('^/tags/'), () => pendingCreate.promise);
        await renderAdminApp('/tags/new', FLAGS);

        await page.getByLabelText('Name', {exact: true}).fill('Weekly News');
        await page.getByRole('button', {name: 'Save'}).click();
        await expect.poll(() => createApi.requests.length).toBe(1);
        await page.getByTestId('tag-detail').getByRole('link', {name: 'Tags'}).click();

        expect(page.getByText('Are you sure you want to leave this page?').query()).toBeNull();
        pendingCreate.resolve({tags: [created]});
        await expect.poll(currentRoute).toBe('/tags');
    });

    it('shows the corrective API context when saving fails validation', async () => {
        const t = tag({name: 'News', slug: 'news'});
        fakeAdminEndpoint('GET', new RegExp(`^/tags/slug/${t.slug}/`), {tags: [t]});
        fakeAdminEndpoint('PUT', new RegExp(`^/tags/${t.id}/`), {
            errors: [{
                code: null,
                context: 'X title cannot be longer than 300 characters.',
                details: null,
                ghostErrorCode: null,
                help: '',
                id: 'validation-error',
                message: 'Validation error, cannot edit tag.',
                property: 'twitter_title',
                type: 'ValidationError'
            }]
        }, {status: 422});
        await renderAdminApp(`/tags/${t.slug}`, FLAGS);

        await page.getByLabelText('Name', {exact: true}).fill('Renamed');
        await page.getByRole('button', {name: 'Save'}).click();

        await expect.element(page.getByText('X title cannot be longer than 300 characters.')).toBeVisible();
        await expect.element(page.getByRole('button', {name: 'Retry'})).toBeVisible();
    });

    it('deletes the tag after confirming, reporting the posts it is used on', async () => {
        const t = tag({name: 'News', slug: 'news', count: {posts: 3}});
        fakeTags([t]);
        fakeTagWorld(t);
        const deleteApi = fakeAdminEndpoint('DELETE', new RegExp(`^/tags/${t.id}/`), null, {status: 204});
        await renderAdminApp(`/tags/${t.slug}`, FLAGS);

        await page.getByRole('button', {name: 'Delete tag', exact: true}).click();

        await expect.element(page.getByText('Are you sure you want to delete this tag?')).toBeVisible();
        await expect.element(page.getByTestId('delete-tag-posts-count')).toHaveTextContent('3 posts');

        await page.getByTestId('confirm-delete-tag').click();

        await expect.poll(currentRoute).toBe('/tags');
        expect(deleteApi.requests.length).toBe(1);
    });

    it('uses the current draft name in the delete confirmation', async () => {
        const t = tag({name: 'News', slug: 'news'});
        fakeTagWorld(t);
        await renderAdminApp(`/tags/${t.slug}`, FLAGS);

        await page.getByLabelText('Name', {exact: true}).fill('Draft name');
        await page.getByRole('button', {name: 'Delete tag', exact: true}).click();

        await expect.element(page.getByTestId('delete-tag-modal').getByText('Draft name', {exact: true})).toBeVisible();
    });

    it('guards leaving with unsaved edits via the breadcrumb', async () => {
        const t = tag({name: 'News', slug: 'news'});
        fakeTags([t]);
        fakeTagWorld(t);
        await renderAdminApp(`/tags/${t.slug}`, FLAGS);

        await page.getByLabelText('Name', {exact: true}).fill('Renamed');
        await page.getByTestId('tag-detail').getByRole('link', {name: 'Tags'}).click();

        // The dialog carries Ember's ConfirmUnsavedChangesModal copy.
        await expect.element(page.getByText('Are you sure you want to leave this page?')).toBeVisible();
        await page.getByRole('button', {name: 'Stay'}).click();
        await expect.element(page.getByLabelText('Name', {exact: true})).toHaveValue('Renamed');

        await page.getByTestId('tag-detail').getByRole('link', {name: 'Tags'}).click();
        await page.getByRole('button', {name: 'Leave'}).click();
        await expect.poll(currentRoute).toBe('/tags');
    });
});

describe('Tag detail (tagDetailsReact off)', () => {
    // No tag fakes are declared in these tests on purpose: if the React screen
    // mounted it would fetch the tag and fail the spec as an unhandled request.
    it('defers /tags/:slug to Ember', async () => {
        await renderAdminApp('/tags/news');

        await expect.poll(currentRoute).toBe('/tags/news');
        expect(page.getByTestId('tag-detail').query()).toBeNull();
    });

    it('defers /tags/new to Ember', async () => {
        await renderAdminApp('/tags/new');

        await expect.poll(currentRoute).toBe('/tags/new');
        expect(page.getByTestId('tag-detail').query()).toBeNull();
    });
});
