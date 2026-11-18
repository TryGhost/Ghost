import { describe, expect, it, onTestFinished } from 'vitest';
import { userEvent } from 'vitest/browser';

import {
  currentRoute,
  currentUserResponse,
  fakeAdminEndpoint,
  fakeEditSettings,
  fakeMembers,
  fakeTags,
  holdSegmentsList,
  label,
  member,
  renderAdminApp,
  settleRequests,
  staffRole,
  withSavedViews,
  type StoredView,
} from '@test-utils/acceptance';
import { sidebarScreen } from '@/layout/sidebar.screen';
import { membersScreen } from './members.screen';

const vip = label({ name: 'VIP' });
const vipFilter = 'label:[VIP]';
const vipRoute = `/members?filter=${encodeURIComponent(vipFilter)}`;
const vips: StoredView = { name: 'VIPs', route: 'members', filter: { filter: vipFilter } };

/** Ghost's answer to a request for an endpoint it doesn't have. */
const notFound = { errors: [{ type: 'NotFoundError', message: 'Resource not found' }] };

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

  it('saves, renames and deletes views through the setting', async () => {
    vipMembers();
    const settingsApi = fakeEditSettings();
    await renderAdminApp(vipRoute);
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

  it('saves a new view once when Enter is pressed again while it saves', async () => {
    vipMembers();
    let release = () => {};
    const saveHeld = new Promise<void>((resolve) => {
      release = resolve;
    });
    // Released however the test ends, as a save left in flight would fail the tests after it.
    onTestFinished(() => release());
    const settingsApi = fakeEditSettings({ respondAfter: saveHeld });
    await renderAdminApp(vipRoute);

    await membersScreen.manageViewButton().click();
    await membersScreen.viewNameInput().fill('VIPs');
    await userEvent.keyboard('{Enter}');
    await expect.poll(() => settingsApi.requests).toHaveLength(1);

    await userEvent.keyboard('{Enter}');
    expect(settingsApi.requests).toHaveLength(1);

    release();
    await expect.element(sidebarScreen.navLink('VIPs')).toHaveAttribute('aria-current', 'page');
    await expect(membersScreen.dialog()).toHaveCount(0);
    // The page's requests are tracked from the moment it sends them, so a second save sent
    // while the first was held has arrived by the time they have all settled.
    await settleRequests();
    expect(settingsApi.requests).toHaveLength(1);
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
  });
});
