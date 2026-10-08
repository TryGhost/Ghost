import { beforeEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import {
  allowUnhandledRequests,
  configResponse,
  currentRoute,
  fakeAdminEndpoint,
  fakeSettingsScreens,
  fakeTags,
  newsletter,
  renderAdminApp,
  type RenderAdminAppOptions,
  tag,
  unsavedChangesGuarded,
} from '@test-utils/acceptance';

import { sidebarScreen } from '@/layout/sidebar.screen';
import { tagDetailScreen } from '@/tags/detail/tag-detail.screen';
import { settingsScreen } from '@/settings/settings.screen';

import { globalSearchScreen } from './global-search.screen';

const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const handoff = () =>
  JSON.parse(document.body.dataset.externalNavigate ?? 'null') as { route: string } | null;

describe('Settings search exits', () => {
  it.each(['tag', 'post'])('confirms before a %s result leaves dirty Settings', async (model) => {
    delete document.body.dataset.externalNavigate;
    if (model === 'post') {
      // the editor owns its request graph
      allowUnhandledRequests();
    }
    fakeSettingsScreens();
    fakeSearchIndex();
    fakeAdminEndpoint('GET', /^\/tags\/slug\/first-tag\//, {
      tags: [tag({ name: 'First tag', slug: 'first-tag' })],
    });
    await renderAdminApp('/settings', { labs: { admin7settings: true } });
    await settingsScreen.editTitle('Unsaved title');
    await expect.poll(unsavedChangesGuarded).toBe(true);
    await openWithShortcut();
    await globalSearchScreen.search(`first ${model}`);
    await globalSearchScreen.option(new RegExp(`First ${model}`)).click();
    await expect.element(settingsScreen.confirmationModal()).toBeVisible();
    await settingsScreen.confirmationAction('Stay').click();
    await expect(settingsScreen.confirmationModal()).toHaveCount(0);
    await expect.poll(currentRoute).toBe('/settings');
    expect(handoff()).toBeNull();
    await expect
      .element(page.getByLabelText('Site title', { exact: true }))
      .toHaveValue('Unsaved title');

    await expect.element(globalSearchScreen.input()).toHaveValue(`first ${model}`);
    await globalSearchScreen.option(new RegExp(`First ${model}`)).click();
    await settingsScreen.confirmationAction('Leave').click();
    if (model === 'post') {
      await expect.poll(currentRoute).toBe('/editor/post/p1');
      expect(handoff()).toBeNull();
    } else {
      await expect.poll(currentRoute).toBe('/tags/first-tag');
      await expect(settingsScreen.titleAndDescription()).toHaveCount(0);
    }
  });
});

describe('Settings search actions', () => {
  it('runs an action over dirty Settings without asking, keeping the edit', async () => {
    fakeSettingsScreens();
    fakeSearchIndex();
    await renderAdminApp('/settings', { labs: { admin7settings: true } });
    await settingsScreen.editTitle('Unsaved title');
    await expect.poll(unsavedChangesGuarded).toBe(true);

    await openWithShortcut();
    await globalSearchScreen.search('dark');
    await globalSearchScreen.option('Switch to dark mode').click();

    await expect.poll(() => document.documentElement.classList.contains('dark')).toBe(true);
    await expect(settingsScreen.confirmationModal()).toHaveCount(0);
    await expect.element(globalSearchScreen.dialog()).not.toBeInTheDocument();
    await expect.poll(currentRoute).toBe('/settings');
    await expect
      .element(page.getByLabelText('Site title', { exact: true }))
      .toHaveValue('Unsaved title');
  });
});

function fakeSearchIndex() {
  return {
    posts: fakeAdminEndpoint('GET', '/search-index/posts/', {
      posts: [{ id: 'p1', title: 'First post', status: 'draft' }],
    }),
    pages: fakeAdminEndpoint('GET', '/search-index/pages/', {
      pages: [{ id: 'g1', title: 'First page', status: 'published' }],
    }),
    tags: fakeAdminEndpoint('GET', '/search-index/tags/', {
      tags: [{ id: 't1', slug: 'first-tag', name: 'First tag' }],
    }),
    users: fakeAdminEndpoint('GET', '/search-index/users/', {
      users: [{ id: 'u1', slug: 'first-user', name: 'First user' }],
    }),
  };
}

function withBilling(): RenderAdminAppOptions {
  const config = configResponse();
  config.config.hostSettings = {
    billing: {
      enabled: true,
      search: {
        groupName: 'Acme Hosting',
        items: [{ id: 'change-plan', title: 'Change plan', path: '/plans', keywords: 'billing' }],
      },
    },
  };
  return { boot: { browseConfig: { response: config } } };
}

/** The listbox the input's `aria-controls` names, or null when it isn't in the DOM. */
function controlledListbox() {
  const id = globalSearchScreen.input().element().getAttribute('aria-controls');
  return id ? document.getElementById(id) : null;
}

async function openAndSearch(term: string) {
  await globalSearchScreen.openButton().click();
  await globalSearchScreen.search(term);
}

async function openWithShortcut() {
  // The sidebar can render before config enables search and its effect registers the shortcut.
  await expect.poll(() => globalSearchScreen.dispatchShortcut()).toBe(true);
  // Handling the key starts a lazy import; wait for the dialog before sending another key.
  await expect.element(globalSearchScreen.input()).toHaveFocus();
}

async function closeWithEscape() {
  await userEvent.keyboard('{Escape}');
  await expect.element(globalSearchScreen.dialog()).not.toBeInTheDocument();
}

describe('Cmd-K search', () => {
  let index: ReturnType<typeof fakeSearchIndex>;

  beforeEach(() => {
    delete document.body.dataset.externalNavigate;
    fakeTags([]);
    index = fakeSearchIndex();
  });

  it('opens from the sidebar button and lists grouped results', async () => {
    await renderAdminApp('/tags');
    await globalSearchScreen.openButton().click();
    await expect.element(globalSearchScreen.input()).toHaveFocus();
    await expect.poll(controlledListbox).not.toBeNull();
    await expect.element(globalSearchScreen.shortcutHint()).not.toBeInTheDocument();

    await globalSearchScreen.search('first');

    await expect.element(globalSearchScreen.group('Staff')).toBeVisible();
    await expect.element(globalSearchScreen.group('Tags')).toBeVisible();
    await expect.element(globalSearchScreen.option(/First post/)).toHaveTextContent('Draft');
    await expect.element(globalSearchScreen.option(/First page/)).toBeVisible();
    await expect.element(globalSearchScreen.highlight(/First post/)).toHaveTextContent('First');
    await expect.element(globalSearchScreen.shortcutHint()).not.toBeInTheDocument();
  });

  it('selects the first result of each search so Enter opens it', async () => {
    // the editor owns its request graph
    allowUnhandledRequests();
    const firstOption = () => globalSearchScreen.dialog().getByRole('option').first();
    await renderAdminApp('/tags');
    await openAndSearch('first');
    await expect.element(firstOption()).toHaveTextContent('First user');
    await expect.element(firstOption()).toHaveAttribute('aria-selected', 'true');

    await userEvent.keyboard('{ArrowDown}');
    await expect.element(firstOption()).toHaveAttribute('aria-selected', 'false');

    await globalSearchScreen.search('first post');
    await expect.element(firstOption()).toHaveTextContent('First post');
    await expect.element(firstOption()).toHaveAttribute('aria-selected', 'true');

    await userEvent.keyboard('{Enter}');
    await expect.poll(currentRoute).toBe('/editor/post/p1');
  });

  it('opens from the shortcut', async () => {
    await renderAdminApp('/tags');
    await expect.element(globalSearchScreen.openButton()).toBeVisible();

    await globalSearchScreen.pressShortcut();

    await expect.element(globalSearchScreen.input()).toHaveFocus();
    await closeWithEscape();
  });

  it('closes on a click below the dialog, which sits on the overlay', async () => {
    await renderAdminApp('/tags');
    await globalSearchScreen.openButton().click();
    await expect.element(globalSearchScreen.input()).toHaveFocus();

    await globalSearchScreen.clickBelowDialog();

    await expect.element(globalSearchScreen.dialog()).not.toBeInTheDocument();
  });

  it('leaves the index alone while closed, then reloads what changed on the next search', async () => {
    const { queryClient } = await renderAdminApp('/tags');
    await openAndSearch('first');
    await expect.element(globalSearchScreen.option(/First post/)).toBeVisible();
    await closeWithEscape();

    void queryClient.invalidateQueries({ queryKey: ['PostsResponseType'] });
    // no request can follow a save while search is closed; allow time for one to start
    await new Promise((resolve) => {
      setTimeout(resolve, 300);
    });
    expect(index.posts.requests).toHaveLength(1);

    await openAndSearch('first');
    await expect.element(globalSearchScreen.option(/First post/)).toBeVisible();
    expect(index.posts.requests).toHaveLength(2);
  });

  it('starts empty each time it opens', async () => {
    await renderAdminApp('/tags');
    await openAndSearch('first');
    await expect.element(globalSearchScreen.option(/First tag/)).toBeVisible();
    await closeWithEscape();

    await globalSearchScreen.openButton().click();

    await expect.element(globalSearchScreen.input()).toHaveValue('');
  });

  it('says when nothing matches', async () => {
    await renderAdminApp('/tags');

    await openAndSearch('nothing like this');

    await expect.element(globalSearchScreen.noResults()).toBeVisible();
  });

  it('opens a tag in the React tag screen', async () => {
    fakeAdminEndpoint('GET', /^\/tags\/slug\/first-tag\//, {
      tags: [tag({ name: 'First tag', slug: 'first-tag' })],
    });
    await renderAdminApp('/tags');
    await openAndSearch('first tag');

    await globalSearchScreen.option(/First tag/).click();

    await expect.poll(currentRoute).toBe('/tags/first-tag');
    await expect.element(globalSearchScreen.dialog()).not.toBeInTheDocument();
  });

  it('returns to the opening route after opening a Staff result in Settings', async () => {
    allowUnhandledRequests();
    await renderAdminApp('/tags', { labs: { admin7settings: true } });
    await openAndSearch('first user');

    await globalSearchScreen.option(/First user/).click();
    await expect.poll(currentRoute).toBe('/settings/staff/first-user');

    await sidebarScreen.shellNav().getByRole('button', { name: 'Back to app' }).click();
    await expect.poll(currentRoute).toBe('/tags');
  });

  it('keeps the original return route when Cmd-K opens another Settings result', async () => {
    allowUnhandledRequests();
    await renderAdminApp('/tags', { labs: { admin7settings: true } });
    await openAndSearch('first user');

    await globalSearchScreen.option(/First user/).click();
    await expect.poll(currentRoute).toBe('/settings/staff/first-user');

    await openWithShortcut();
    await globalSearchScreen.search('first user');
    await globalSearchScreen.option(/First user/).click();
    await expect.poll(currentRoute).toBe('/settings/staff/first-user');

    await sidebarScreen.shellNav().getByRole('button', { name: 'Back to app' }).click();
    await expect.poll(currentRoute).toBe('/tags');
  });

  it('opens a Settings section and returns to the opening route', async () => {
    fakeSettingsScreens();
    await renderAdminApp('/tags', { labs: { admin7settings: true } });
    await openAndSearch('timezone');

    await globalSearchScreen.option(/Timezone/).click();
    await expect.poll(currentRoute).toBe('/settings/timezone?open');
    await expect.element(settingsScreen.timezone()).toBeInViewport();

    await sidebarScreen.shellNav().getByRole('button', { name: 'Back to app' }).click();
    await expect.poll(currentRoute).toBe('/tags');
  });

  it('opens a Settings section the way its header button does', async () => {
    fakeSettingsScreens();
    await renderAdminApp('/tags', { labs: { admin7settings: true } });
    await openAndSearch('navigation');

    await globalSearchScreen.option(/^Navigation$/).click();
    await expect.poll(currentRoute).toBe('/settings/navigation/edit');
    await expect.element(settingsScreen.navigationModal()).toBeVisible();

    history.back();
    await expect.poll(currentRoute).toBe('/settings/navigation?open');
    await expect.element(settingsScreen.navigationModal()).not.toBeInTheDocument();
  });

  it('keeps an opened Settings section in view while the page above it loads', async () => {
    fakeSettingsScreens();
    const newsletters = Array.from({ length: 12 }, (_, position) =>
      newsletter({
        id: `n${position}`,
        name: `Newsletter ${position}`,
        slug: `newsletter-${position}`,
      }),
    );
    fakeAdminEndpoint('GET', /^\/newsletters\//, async () => {
      await wait(800);
      return {
        newsletters,
        meta: {
          pagination: {
            page: 1,
            limit: 50,
            pages: 1,
            total: newsletters.length,
            next: null,
            prev: null,
          },
        },
      };
    });
    await renderAdminApp('/tags', { labs: { admin7settings: true } });
    await openAndSearch('labs');

    await globalSearchScreen.option(/^Labs$/).click();
    await expect.poll(currentRoute).toBe('/settings/labs?open');
    await expect.element(page.getByRole('tab', { name: 'Beta features' })).toBeVisible();

    await expect.element(page.getByText('Newsletter 11')).toBeInTheDocument();
    await wait(300);
    await expect.element(page.getByTestId('labs')).toBeInViewport();
  });

  it('opens a Settings section the Settings filter had hidden', async () => {
    fakeSettingsScreens();
    await renderAdminApp('/settings', { labs: { admin7settings: true } });
    await settingsScreen.search().fill('design');
    await expect.element(page.getByTestId('labs')).not.toBeVisible();

    await openWithShortcut();
    await globalSearchScreen.search('labs');
    await globalSearchScreen.option(/^Labs$/).click();

    await expect.element(settingsScreen.search()).toHaveValue('');
    await expect.element(page.getByRole('tab', { name: 'Beta features' })).toBeVisible();
    await expect.element(page.getByTestId('labs')).toBeInViewport();
  });

  it('opens a Settings section with an Edit button for editing', async () => {
    fakeSettingsScreens();
    await renderAdminApp('/tags', { labs: { admin7settings: true } });
    await openAndSearch('site description');

    await globalSearchScreen.option('Title & description').click();

    await expect.poll(currentRoute).toBe('/settings/general?open');
    await expect
      .element(settingsScreen.titleAndDescription().getByLabelText('Site title', { exact: true }))
      .toBeVisible();
  });

  it.each([
    ['another section', '/settings'],
    ['the section on screen', '/settings/timezone'],
  ])('shows %s while the Settings filter hides it', async (_description, route) => {
    fakeSettingsScreens();
    await renderAdminApp(route, { labs: { admin7settings: true } });
    await settingsScreen.search().fill('design');
    await expect.element(settingsScreen.timezone()).not.toBeVisible();

    await openWithShortcut();
    await globalSearchScreen.search('timezone');
    await globalSearchScreen.option(/Timezone/).click();

    await expect.poll(currentRoute).toBe('/settings/timezone?open');
    await expect.element(settingsScreen.search()).toHaveValue('');
    await expect.element(settingsScreen.timezone()).toBeInViewport();
  });

  it('switches the appearance', async () => {
    const isDarkMode = () => document.documentElement.classList.contains('dark');
    await renderAdminApp('/tags');
    await openAndSearch('dark');

    await globalSearchScreen.option('Switch to dark mode').click();
    await expect.poll(isDarkMode).toBe(true);
    await expect.element(globalSearchScreen.dialog()).not.toBeInTheDocument();

    await openAndSearch('light');
    await globalSearchScreen.option('Switch to light mode').click();
    await expect.poll(isDarkMode).toBe(false);
  });

  it('opens a post in the React editor when React serves it', async () => {
    // the editor owns its request graph
    allowUnhandledRequests();
    await renderAdminApp('/tags', { labs: { editorReact: true } });
    await openAndSearch('first post');

    await globalSearchScreen.option(/First post/).click();

    await expect.poll(currentRoute).toBe('/editor/post/p1');
    expect(handoff()).toBeNull();
  });

  it('opens a billing result at its billing route', async () => {
    await renderAdminApp('/tags', withBilling());
    await openAndSearch('plan');

    await globalSearchScreen.option(/Change plan/).click();

    await expect.poll(currentRoute).toBe('/pro/plans');
  });

  it('leaves the shortcut alone while another dialog is open', async () => {
    const firstTag = tag({ name: 'First tag', slug: 'first-tag' });
    fakeTags([firstTag]);
    fakeAdminEndpoint('GET', /^\/tags\/slug\/first-tag\//, { tags: [firstTag] });
    await renderAdminApp('/tags/first-tag');
    await openWithShortcut();
    await closeWithEscape();

    await tagDetailScreen.actionsButton().click();
    await tagDetailScreen.deleteTagMenuItem().click();
    await expect.element(tagDetailScreen.deleteModal()).toBeVisible();

    expect(globalSearchScreen.dispatchShortcut()).toBe(false);
    await expect.element(globalSearchScreen.dialog()).not.toBeInTheDocument();
  });

  it('closes and ignores the shortcut once the sidebar is hidden', async () => {
    // the editor owns its request graph
    allowUnhandledRequests();
    await renderAdminApp('/tags');
    await openWithShortcut();

    window.location.hash = '#/editor/post/p1';

    await expect.element(sidebarScreen.shellNav()).not.toBeInTheDocument();
    await expect.element(globalSearchScreen.dialog()).not.toBeInTheDocument();
    expect(globalSearchScreen.dispatchShortcut()).toBe(false);
  });
});
