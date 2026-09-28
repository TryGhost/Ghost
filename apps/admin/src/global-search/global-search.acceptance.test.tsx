import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import {
  allowUnhandledRequests,
  configResponse,
  currentRoute,
  fakeAdminEndpoint,
  fakeTags,
  renderAdminApp,
  type RenderAdminAppOptions,
  tag,
} from '@test-utils/acceptance';

import type { EmberDataChangeEvent } from '@/ember-bridge';
import { sidebarScreen } from '@/layout/sidebar.screen';
import { tagDetailScreen } from '@/tags/detail/tag-detail.screen';

import { globalSearchScreen } from './global-search.screen';

const flagOn: RenderAdminAppOptions = { labs: { globalSearchReact: true } };

const handoff = () =>
  JSON.parse(document.body.dataset.externalNavigate ?? 'null') as { route: string } | null;

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
  return { ...flagOn, boot: { browseConfig: { response: config } } };
}

/** The Ember half of the state bridge: the billing handoff, and saves Ember reports. */
function installEmberBridge() {
  const navigateToBillingSubRoute = vi.fn();
  const dataChangeHandlers = new Set<(event: EmberDataChangeEvent) => void>();
  const state = {
    on: (event: string, callback: (event: EmberDataChangeEvent) => void) => {
      if (event === 'emberDataChange') {
        dataChangeHandlers.add(callback);
      }
    },
    off: (_event: string, callback: (event: EmberDataChangeEvent) => void) => {
      dataChangeHandlers.delete(callback);
    },
    sidebarVisible: true,
    getRouteUrl: (routeName: string) => routeName,
    isRouteActive: () => false,
    navigateToBillingSubRoute,
  };
  window.EmberBridge = { state } as unknown as typeof window.EmberBridge;

  return {
    navigateToBillingSubRoute,
    reportSave: (modelName: string) => {
      dataChangeHandlers.forEach((handler) =>
        handler({ operation: 'update', modelName, id: 'p1', data: null }),
      );
    },
  };
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

  afterEach(() => {
    delete window.EmberBridge;
  });

  it('opens from the sidebar button and lists grouped results', async () => {
    await renderAdminApp('/tags', flagOn);
    await globalSearchScreen.openButton().click();
    await expect.element(globalSearchScreen.input()).toHaveFocus();
    await expect.poll(controlledListbox).not.toBeNull();
    await expect
      .element(globalSearchScreen.shortcutHint())
      .toHaveTextContent('Open with Ctrl/⌘ + K');

    await globalSearchScreen.search('first');

    await expect.element(globalSearchScreen.group('Staff')).toBeVisible();
    await expect.element(globalSearchScreen.group('Tags')).toBeVisible();
    await expect.element(globalSearchScreen.option(/First post/)).toHaveTextContent('Draft');
    await expect.element(globalSearchScreen.option(/First page/)).toBeVisible();
    await expect.element(globalSearchScreen.highlight(/First post/)).toHaveTextContent('First');
    await expect.element(globalSearchScreen.shortcutHint()).not.toBeInTheDocument();
  });

  it('opens from the shortcut after Ember has already handled the key', async () => {
    // Ember's keymaster binding runs first and prevents the default
    const emberShortcut = (event: KeyboardEvent) => event.preventDefault();
    document.addEventListener('keydown', emberShortcut);

    try {
      await renderAdminApp('/tags', flagOn);
      await expect.element(globalSearchScreen.openButton()).toBeVisible();

      await globalSearchScreen.pressShortcut();

      await expect.element(globalSearchScreen.input()).toHaveFocus();
      await closeWithEscape();
    } finally {
      document.removeEventListener('keydown', emberShortcut);
    }
  });

  it('closes on a click over the shortcut hint, which sits on the overlay', async () => {
    await renderAdminApp('/tags', flagOn);
    await globalSearchScreen.openButton().click();
    await expect.element(globalSearchScreen.shortcutHint()).toBeVisible();

    await globalSearchScreen.clickAt(globalSearchScreen.shortcutHint());

    await expect.element(globalSearchScreen.dialog()).not.toBeInTheDocument();
  });

  it('leaves the index alone while closed, then reloads what changed on the next search', async () => {
    const ember = installEmberBridge();
    await renderAdminApp('/tags', flagOn);
    await openAndSearch('first');
    await expect.element(globalSearchScreen.option(/First post/)).toBeVisible();
    await closeWithEscape();

    ember.reportSave('post');
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
    await renderAdminApp('/tags', flagOn);
    await openAndSearch('first');
    await expect.element(globalSearchScreen.option(/First tag/)).toBeVisible();
    await closeWithEscape();

    await globalSearchScreen.openButton().click();

    await expect.element(globalSearchScreen.input()).toHaveValue('');
  });

  it('says when nothing matches', async () => {
    await renderAdminApp('/tags', flagOn);

    await openAndSearch('nothing like this');

    await expect.element(globalSearchScreen.noResults()).toBeVisible();
  });

  it('opens a tag in the React tag screen', async () => {
    fakeAdminEndpoint('GET', /^\/tags\/slug\/first-tag\//, {
      tags: [tag({ name: 'First tag', slug: 'first-tag' })],
    });
    await renderAdminApp('/tags', flagOn);
    await openAndSearch('first tag');

    await globalSearchScreen.option(/First tag/).click();

    await expect.poll(currentRoute).toBe('/tags/first-tag');
    await expect.element(globalSearchScreen.dialog()).not.toBeInTheDocument();
  });

  it('hands a post to the Ember editor', async () => {
    await renderAdminApp('/tags', flagOn);
    await openAndSearch('first post');
    await expect.element(globalSearchScreen.option(/First post/)).toBeVisible();

    await userEvent.keyboard('{Enter}');

    await expect.poll(() => handoff()?.route).toBe('/editor/post/p1');
  });

  it('opens a post in the React editor when React serves it', async () => {
    // the editor owns its request graph
    allowUnhandledRequests();
    await renderAdminApp('/tags', { labs: { globalSearchReact: true, editorReact: true } });
    await openAndSearch('first post');

    await globalSearchScreen.option(/First post/).click();

    await expect.poll(currentRoute).toBe('/editor/post/p1');
    expect(handoff()).toBeNull();
  });

  it('hands a billing result to the billing app route', async () => {
    await renderAdminApp('/tags', withBilling());
    await openAndSearch('plan');

    await globalSearchScreen.option(/Change plan/).click();

    await expect.poll(() => handoff()?.route).toBe('/pro/plans');
  });

  it('sends a billing result for the billing route on screen straight to the billing app', async () => {
    const { navigateToBillingSubRoute } = installEmberBridge();
    await renderAdminApp('/pro/plans', withBilling());
    await openAndSearch('plan');

    await globalSearchScreen.option(/Change plan/).click();

    await expect.poll(() => navigateToBillingSubRoute.mock.calls).toEqual([['/plans']]);
    expect(handoff()).toBeNull();
  });

  it('leaves the shortcut alone while another dialog is open', async () => {
    const firstTag = tag({ name: 'First tag', slug: 'first-tag' });
    fakeTags([firstTag]);
    fakeAdminEndpoint('GET', /^\/tags\/slug\/first-tag\//, { tags: [firstTag] });
    await renderAdminApp('/tags/first-tag', flagOn);
    await openWithShortcut();
    await closeWithEscape();

    await tagDetailScreen.actionsButton().click();
    await tagDetailScreen.deleteTagMenuItem().click();
    await expect.element(tagDetailScreen.deleteModal()).toBeVisible();

    expect(globalSearchScreen.dispatchShortcut()).toBe(false);
    await expect.element(globalSearchScreen.dialog()).not.toBeInTheDocument();
  });

  it('closes and ignores the shortcut once the sidebar is hidden', async () => {
    await renderAdminApp('/tags', flagOn);
    await openWithShortcut();

    window.location.hash = '#/editor/post/p1';

    await expect.element(sidebarScreen.shellNav()).not.toBeInTheDocument();
    await expect.element(globalSearchScreen.dialog()).not.toBeInTheDocument();
    expect(globalSearchScreen.dispatchShortcut()).toBe(false);
  });

  it('leaves search to Ember without the flag', async () => {
    const emberKeypresses: KeyboardEvent[] = [];
    const recordKeypress = (event: KeyboardEvent) => emberKeypresses.push(event);
    document.addEventListener('keydown', recordKeypress);

    try {
      await renderAdminApp('/tags');
      await globalSearchScreen.openButton().click();

      expect(emberKeypresses.map((event) => event.keyCode)).toEqual([75]);
      expect(globalSearchScreen.dispatchShortcut()).toBe(false);
    } finally {
      document.removeEventListener('keydown', recordKeypress);
    }
  });
});
