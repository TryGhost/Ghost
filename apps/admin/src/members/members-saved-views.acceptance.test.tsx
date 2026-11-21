import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import {
  currentRoute,
  currentUserResponse,
  fakeAdminEndpoint,
  fakeEditSettings,
  fakeMembers,
  fakePosts,
  fakePostsListScreen,
  fakeSegmentWrites,
  fakeTags,
  holdSegmentsList,
  label,
  member,
  renderAdminApp,
  replaceSavedViewsElsewhere,
  segmentsBodyError,
  settleRequests,
  staffRole,
  withSavedViews,
  withoutSegmentsApi,
  type SegmentWritesCapture,
  type StoredView,
} from '@test-utils/acceptance';
import { sidebarScreen } from '@/layout/sidebar.screen';
import { postsListScreen } from '@/posts/list/posts-list.screen';
import { clearStickyPostFilters } from '@/posts/list/posts-sticky-filters';
import { membersScreen } from './members.screen';

const vip = label({ name: 'VIP' });
const vipFilter = 'label:[VIP]';
const vipRoute = `/members?filter=${encodeURIComponent(vipFilter)}`;
const vips: StoredView = { name: 'VIPs', route: 'members', filter: { filter: vipFilter } };
const gold: StoredView = { name: 'Gold', route: 'members', filter: { filter: 'label:[Gold]' } };
const goldRoute = `/members?filter=${encodeURIComponent('label:[Gold]')}`;

/** Ghost's answer to a request for an endpoint it doesn't have. */
const notFound = { errors: [{ type: 'NotFoundError', message: 'Resource not found' }] };

/** The segment writes sent, with each segment's opaque id in the path shown as `:id`. */
function sentWrites({ requests }: SegmentWritesCapture) {
  return requests.map(({ method, path, body }) => ({
    method,
    path: path.replace(/^\/segments\/[^/]+\/$/, '/segments/:id/'),
    body,
  }));
}

function vipMembers() {
  return fakeMembers(({ filter }) =>
    filter
      ? [member({ name: 'Vip One', labels: [vip] })]
      : [member({ name: 'Vip One', labels: [vip] }), member({ name: 'Plain' })],
  );
}

describe('Members saved views', () => {
  it('lists the views the segments API returns', async () => {
    vipMembers();
    await renderAdminApp(vipRoute, {
      boot: {
        browseSegments: {
          response: { segments: [{ id: 'vips', name: 'VIPs', filter: vipFilter }] },
        },
      },
    });

    await expect.element(sidebarScreen.navLink('VIPs')).toHaveAttribute('aria-current', 'page');
    await expect.element(membersScreen.manageViewButton()).toHaveTextContent('Edit view');
  });

  it('shows the views from the settings while the segments list loads', async () => {
    vipMembers();
    const releaseSegments = holdSegmentsList();
    await renderAdminApp(vipRoute, withSavedViews(vips));

    try {
      await expect.element(sidebarScreen.navLink('VIPs')).toHaveAttribute('aria-current', 'page');
      await expect.element(membersScreen.manageViewButton()).toHaveTextContent('Edit view');
    } finally {
      releaseSegments();
    }
  });

  it('shows the views from the settings, and no error, when the segments list fails', async () => {
    vipMembers();
    fakeAdminEndpoint(
      'GET',
      '/segments/',
      { errors: [{ type: 'InternalServerError', message: 'Something went wrong' }] },
      { status: 500 },
    );
    await renderAdminApp(vipRoute, withSavedViews(vips));

    await expect.element(sidebarScreen.navLink('VIPs')).toHaveAttribute('aria-current', 'page');
    await expect.element(membersScreen.manageViewButton()).toHaveTextContent('Edit view');
    await expect(sidebarScreen.errorToast()).toHaveCount(0);
  });

  it('asks for segments only for staff who are shown member views', async () => {
    fakeTags([]);
    const segmentsApi = fakeAdminEndpoint('GET', '/segments/', { segments: [] });
    const editor = currentUserResponse();
    editor.users[0].roles = [staffRole({ name: 'Editor' })];
    await renderAdminApp('/tags', { boot: { browseMe: { response: editor } } });

    await expect.element(sidebarScreen.navLink('Tags')).toBeVisible();
    await expect.element(sidebarScreen.navLink('Members')).not.toBeInTheDocument();
    await settleRequests();
    expect(segmentsApi.requests).toHaveLength(0);
  });

  it('saves the filters as a new view through the segments API', async () => {
    vipMembers();
    const segmentsApi = fakeSegmentWrites();
    await renderAdminApp(vipRoute);
    await expect.element(membersScreen.manageViewButton()).toHaveTextContent('Save view');

    await membersScreen.saveView('VIPs');

    await expect.element(sidebarScreen.navLink('VIPs')).toHaveAttribute('aria-current', 'page');
    await expect.element(membersScreen.manageViewButton()).toHaveTextContent('Edit view');
    expect(segmentsApi.requests).toEqual([
      {
        method: 'POST',
        path: '/segments/',
        body: { segments: [{ name: 'VIPs', filter: vipFilter }] },
      },
    ]);
  });

  it('saves a new view once when Enter is pressed again while it saves', async () => {
    vipMembers();
    let release = () => {};
    const saveHeld = new Promise<void>((resolve) => {
      release = resolve;
    });
    const segmentsApi = fakeSegmentWrites({ respondAfter: saveHeld });
    await renderAdminApp(vipRoute);

    // The held save is released in the test body, also when an assertion fails. The harness
    // waits for requests to finish in its `afterEach`, which runs before `onTestFinished`, so
    // a save still held there would time out and then be answered after the fake server reset.
    try {
      await membersScreen.manageViewButton().click();
      await membersScreen.viewNameInput().fill('VIPs');
      await userEvent.keyboard('{Enter}');
      await expect.poll(() => segmentsApi.requests).toHaveLength(1);

      await userEvent.keyboard('{Enter}');
      expect(segmentsApi.requests).toHaveLength(1);
    } finally {
      release();
    }

    await expect.element(sidebarScreen.navLink('VIPs')).toHaveAttribute('aria-current', 'page');
    await expect(membersScreen.dialog()).toHaveCount(0);
    // The page's requests are tracked from the moment it sends them, so a second save sent
    // while the first was held has arrived by the time they have all settled.
    await settleRequests();
    expect(segmentsApi.requests).toHaveLength(1);
  });

  it('renames the active view in place', async () => {
    vipMembers();
    const segmentsApi = fakeSegmentWrites();
    await renderAdminApp(vipRoute, withSavedViews(vips, gold));
    await expect.element(membersScreen.manageViewButton()).toHaveTextContent('Edit view');

    await membersScreen.saveView('Very important');

    await expect
      .element(sidebarScreen.navLink('Very important'))
      .toHaveAttribute('aria-current', 'page');
    await expect.element(sidebarScreen.navLink('VIPs')).not.toBeInTheDocument();
    expect(sentWrites(segmentsApi)).toEqual([
      { method: 'PUT', path: '/segments/:id/', body: { segments: [{ name: 'Very important' }] } },
    ]);
  });

  it('renames a view opened while the segments list was still loading', async () => {
    vipMembers();
    const segmentsApi = fakeSegmentWrites();
    const releaseSegments = holdSegmentsList();
    await renderAdminApp(vipRoute, withSavedViews(vips, gold));

    try {
      await expect.element(membersScreen.manageViewButton()).toHaveTextContent('Edit view');
      await membersScreen.saveView('Very important');
      // The save has started and is waiting for the list, so a write sent without it would
      // have been sent by now.
      await expect.element(membersScreen.viewPopoverButton('Saving...')).toBeVisible();
      expect(segmentsApi.requests).toHaveLength(0);
    } finally {
      releaseSegments();
    }

    await expect
      .element(sidebarScreen.navLink('Very important'))
      .toHaveAttribute('aria-current', 'page');
    expect(sentWrites(segmentsApi)).toEqual([
      { method: 'PUT', path: '/segments/:id/', body: { segments: [{ name: 'Very important' }] } },
    ]);
  });

  it("shows the server's reason for refusing a name and keeps the popover open", async () => {
    vipMembers();
    fakeSegmentWrites();
    await renderAdminApp(vipRoute, withSavedViews(vips, gold));
    await expect.element(membersScreen.manageViewButton()).toHaveTextContent('Edit view');

    await membersScreen.saveView('GOLD');

    await expect
      .element(membersScreen.dialog())
      .toHaveTextContent('A view with this name already exists');
    await expect.element(membersScreen.viewNameInput()).toBeVisible();
    await expect.element(sidebarScreen.navLink('VIPs')).toBeVisible();
  });

  it("shows a failed save, not the server's text, when the request body is refused", async () => {
    vipMembers();
    fakeSegmentWrites();
    fakeAdminEndpoint(
      'PUT',
      /^\/segments\/[^/]+\/$/,
      segmentsBodyError('edit', {
        code: 'custom',
        message: 'Name cannot be longer than 191 characters',
        path: ['body', 'segments', 0, 'name'],
      }),
      { status: 422 },
    );
    await renderAdminApp(vipRoute, withSavedViews(vips, gold));
    await expect.element(membersScreen.manageViewButton()).toHaveTextContent('Edit view');

    await membersScreen.saveView('Very important');

    await expect.element(membersScreen.dialog()).toHaveTextContent('Failed to save view');
    await expect.element(membersScreen.dialog()).not.toHaveTextContent('Validation');
    await expect.element(membersScreen.dialog()).not.toHaveTextContent('191');
    await expect.element(sidebarScreen.navLink('VIPs')).toBeVisible();
  });

  it('stops a view name at the longest the server accepts', async () => {
    vipMembers();
    const segmentsApi = fakeSegmentWrites();
    const longestName = 'a'.repeat(191);
    await renderAdminApp(vipRoute);

    await membersScreen.manageViewButton().click();
    await membersScreen.viewNameInput().click();
    await userEvent.keyboard('a'.repeat(200));
    await expect.element(membersScreen.viewNameInput()).toHaveValue(longestName);
    await membersScreen.viewPopoverButton('Save').click();

    await expect(membersScreen.dialog()).toHaveCount(0);
    expect(segmentsApi.requests).toEqual([
      {
        method: 'POST',
        path: '/segments/',
        body: { segments: [{ name: longestName, filter: vipFilter }] },
      },
    ]);
  });

  it('says a view another session deleted no longer exists and refreshes the views', async () => {
    vipMembers();
    fakeSegmentWrites();
    await renderAdminApp(vipRoute, withSavedViews(vips, gold));
    await expect.element(membersScreen.manageViewButton()).toHaveTextContent('Edit view');
    replaceSavedViewsElsewhere(gold);

    await membersScreen.saveView('Very important');

    await expect.element(sidebarScreen.navLink('VIPs')).not.toBeInTheDocument();
    await expect.element(sidebarScreen.navLink('Gold')).toBeVisible();
    // The filters no longer match a saved view, so the popover offers to save them as one. It
    // keeps the reason the save was refused and the name that was typed.
    await expect.element(membersScreen.manageViewButton()).toHaveTextContent('Save view');
    await expect.element(membersScreen.dialog()).toHaveTextContent('This view no longer exists');
    await expect.element(membersScreen.viewNameInput()).toHaveValue('Very important');
  });

  it('starts the name afresh when other filters are opened while the popover is open', async () => {
    vipMembers();
    await renderAdminApp(goldRoute, withSavedViews(vips));
    await expect.element(membersScreen.manageViewButton()).toHaveTextContent('Save view');
    await sidebarScreen.navLink('VIPs').click();
    await membersScreen.manageViewButton().click();
    await expect.element(membersScreen.viewNameInput()).toHaveValue('VIPs');

    // Back to the filters that aren't a saved view, without closing the popover.
    window.history.back();

    await expect
      .element(membersScreen.dialog().getByRole('heading', { name: 'Save view' }))
      .toBeVisible();
    await expect.element(membersScreen.viewNameInput()).toHaveValue('');
  });

  it('shows a Super Editor the saved views without the button that changes them', async () => {
    vipMembers();
    const superEditor = currentUserResponse();
    superEditor.users[0].roles = [staffRole({ name: 'Super Editor' })];
    const savedViews = withSavedViews(vips);
    await renderAdminApp(vipRoute, {
      boot: { ...savedViews.boot, browseMe: { response: superEditor } },
    });

    await expect.element(sidebarScreen.navLink('VIPs')).toHaveAttribute('aria-current', 'page');
    await expect.element(membersScreen.memberRow('Vip One')).toBeVisible();
    await expect.element(membersScreen.manageViewButton()).not.toBeInTheDocument();
  });

  it('says so when the server refuses a save for lack of permission', async () => {
    vipMembers();
    fakeSegmentWrites();
    fakeAdminEndpoint(
      'POST',
      '/segments/',
      { errors: [{ type: 'NoPermissionError', message: 'Permission error, cannot add segment.' }] },
      { status: 403 },
    );
    await renderAdminApp(vipRoute);

    await membersScreen.saveView('VIPs');

    await expect
      .element(membersScreen.dialog())
      .toHaveTextContent('You do not have permission to save views');
    await expect.element(membersScreen.dialog()).not.toHaveTextContent('segment');
  });

  it('deletes the active view and returns to all members', async () => {
    vipMembers();
    const segmentsApi = fakeSegmentWrites();
    await renderAdminApp(vipRoute, withSavedViews(vips, gold));
    await expect.element(membersScreen.manageViewButton()).toHaveTextContent('Edit view');

    await membersScreen.deleteView();

    await expect.element(sidebarScreen.navLink('VIPs')).not.toBeInTheDocument();
    await expect.element(sidebarScreen.navLink('Gold')).toBeVisible();
    await expect.poll(currentRoute).toBe('/members');
    expect(sentWrites(segmentsApi)).toEqual([
      { method: 'DELETE', path: '/segments/:id/', body: undefined },
    ]);
  });

  // Posts views are saved by rewriting the whole shared_views setting, and that setting holds the
  // member views too.
  describe('beside posts views', () => {
    beforeEach(() => {
      vipMembers();
      fakePostsListScreen();
      fakePosts([]);
    });

    afterEach(() => {
      clearStickyPostFilters();
    });

    it('keeps a member view saved earlier in the session when a posts view is saved', async () => {
      fakeSegmentWrites();
      const settingsApi = fakeEditSettings();
      await renderAdminApp(vipRoute);
      await membersScreen.saveView('VIPs');
      await expect.element(sidebarScreen.navLink('VIPs')).toBeVisible();

      await sidebarScreen.navLink('Posts').click();
      await postsListScreen.addFilter('Access', 'Members-only');
      await postsListScreen.saveView('Members only', 'blue');

      await expect(settingsApi).toHaveEditedSettings([
        {
          key: 'shared_views',
          value: JSON.stringify([
            vips,
            {
              name: 'Members only',
              route: 'posts',
              color: 'blue',
              filter: { visibility: 'members' },
            },
          ]),
        },
      ]);
      await expect.element(sidebarScreen.navLink('VIPs')).toBeVisible();
    });

    it('saves a member view through the segments API after a posts view, keeping both', async () => {
      fakeSegmentWrites();
      const settingsApi = fakeEditSettings();
      await renderAdminApp('/posts?visibility=members');
      await postsListScreen.saveView('Members only', 'blue');
      await expect.element(sidebarScreen.navLink('Members only')).toBeVisible();

      window.location.hash = `#${vipRoute}`;
      await expect.element(membersScreen.manageViewButton()).toHaveTextContent('Save view');
      await membersScreen.saveView('VIPs');
      await settleRequests();

      await expect.element(sidebarScreen.navLink('VIPs')).toHaveAttribute('aria-current', 'page');
      await expect.element(sidebarScreen.navLink('Members only')).toBeVisible();
      expect(settingsApi.requests).toHaveLength(1);
    });
  });

  describe('on a server without the segments API', () => {
    it('lists the views from the setting, asks for segments once and shows no error', async () => {
      vipMembers();
      fakeTags([]);
      const segmentsApi = fakeAdminEndpoint('GET', '/segments/', notFound, { status: 404 });
      await renderAdminApp(vipRoute, withSavedViews(vips));

      await expect.element(sidebarScreen.navLink('VIPs')).toHaveAttribute('aria-current', 'page');
      await expect.element(membersScreen.manageViewButton()).toHaveTextContent('Edit view');

      await sidebarScreen.navLink('Tags').click();
      await expect.element(membersScreen.manageViewButton()).not.toBeInTheDocument();
      await sidebarScreen.navLink('VIPs').click();

      await expect.element(membersScreen.manageViewButton()).toHaveTextContent('Edit view');
      await settleRequests();
      expect(segmentsApi.requests).toHaveLength(1);
      await expect(sidebarScreen.errorToast()).toHaveCount(0);
    });

    it('saves, renames and deletes views through the setting', async () => {
      vipMembers();
      const settingsApi = fakeEditSettings();
      await renderAdminApp(vipRoute, { boot: withoutSegmentsApi });
      await expect.element(membersScreen.manageViewButton()).toHaveTextContent('Save view');

      await membersScreen.saveView('VIPs');
      await expect(settingsApi).toHaveEditedSettings([
        { key: 'shared_views', value: JSON.stringify([vips]) },
      ]);
      await expect.element(sidebarScreen.navLink('VIPs')).toHaveAttribute('aria-current', 'page');
      await expect.element(membersScreen.manageViewButton()).toHaveTextContent('Edit view');

      await membersScreen.saveView('Very important');
      await expect(settingsApi).toHaveEditedSettings([
        { key: 'shared_views', value: JSON.stringify([{ ...vips, name: 'Very important' }]) },
      ]);
      await expect
        .element(sidebarScreen.navLink('Very important'))
        .toHaveAttribute('aria-current', 'page');

      await membersScreen.deleteView();
      await expect(settingsApi).toHaveEditedSettings([{ key: 'shared_views', value: '[]' }]);
      await expect.element(sidebarScreen.navLink('Very important')).not.toBeInTheDocument();
      await expect.poll(currentRoute).toBe('/members');
    });

    it('saves through the setting once a server that had the segments API loses it', async () => {
      vipMembers();
      const settingsApi = fakeEditSettings();
      await renderAdminApp(vipRoute, withSavedViews(gold));
      await expect.element(sidebarScreen.navLink('Gold')).toBeVisible();
      // The sidebar shows views from the cached settings before the segments list arrives, so
      // wait for the page's requests: the list has to load before the server loses the API.
      await settleRequests();
      // The server is rolled back to a version without the segments API.
      fakeAdminEndpoint('GET', '/segments/', notFound, { status: 404 });
      fakeAdminEndpoint('POST', '/segments/', notFound, { status: 404 });

      await membersScreen.saveView('VIPs');
      await expect.element(membersScreen.dialog()).toHaveTextContent('Failed to save view');
      await expect.element(membersScreen.dialog()).not.toHaveTextContent('no longer exists');
      await settleRequests();

      await membersScreen.viewPopoverButton('Save').click();
      await expect(settingsApi).toHaveEditedSettings([
        { key: 'shared_views', value: JSON.stringify([gold, vips]) },
      ]);
      await expect.element(sidebarScreen.navLink('VIPs')).toHaveAttribute('aria-current', 'page');
      await expect.element(sidebarScreen.navLink('Gold')).toBeVisible();
    });
  });
});
