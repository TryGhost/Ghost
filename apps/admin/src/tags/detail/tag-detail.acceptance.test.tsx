import {describe, expect, it} from 'vitest';
import {page, userEvent} from 'vitest/browser';

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
        await expect.element(page.getByLabelText('Description', {exact: true})).toHaveValue('All the news');
        await expect.element(page.getByRole('button', {name: 'Delete tag', exact: true})).toBeVisible();
    });

    it('remains accessible during a force upgrade', async () => {
        const t = tag({name: 'News', slug: 'news'});
        const config = configResponse(FLAGS);
        config.config.hostSettings = {forceUpgrade: true};
        fakeTagWorld(t);

        await renderAdminApp(`/tags/${t.slug}`, {
            ...FLAGS,
            boot: {browseConfig: {response: config}}
        });

        await expect.poll(currentRoute).toBe('/tags/news');
        await expect.element(page.getByTestId('tag-detail-title')).toHaveTextContent('News');
    });

    it('offers Unsplash for an empty tag image', async () => {
        const t = tag({name: 'News', slug: 'news', feature_image: null});
        fakeTagWorld(t);
        fakeEndpoint('GET', 'https://api.unsplash.com/photos', []);
        await renderAdminApp(`/tags/${t.slug}`, FLAGS);

        await page.getByRole('button', {name: 'Select tag image from Unsplash'}).click();

        await expect.element(page.getByRole('heading', {name: 'Unsplash'})).toBeVisible();
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
        await userEvent.type(nameInput.element(), 'Weekly News');
        await expect.element(page.getByLabelText('Slug', {exact: true})).toHaveValue('weekly-news');

        await page.getByRole('button', {name: 'Save'}).click();

        // Ember replaces `/tags/new` with the saved tag's route after creating.
        await expect.poll(currentRoute).toBe('/tags/weekly-news');
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

        await expect.element(page.getByText('You must specify a name for the tag.').first()).toBeVisible();
        expect(saveApi.requests.length).toBe(0);
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
