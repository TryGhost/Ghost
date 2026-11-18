import { describe, expect, it } from 'vitest';

import {
  currentRoute,
  fakeEditSettings,
  fakeMembers,
  label,
  member,
  renderAdminApp,
  type StoredView,
} from '@test-utils/acceptance';
import { sidebarScreen } from '@/layout/sidebar.screen';
import { membersScreen } from './members.screen';

const vip = label({ name: 'VIP' });
const vipFilter = 'label:[VIP]';
const vipRoute = `/members?filter=${encodeURIComponent(vipFilter)}`;
const vips: StoredView = { name: 'VIPs', route: 'members', filter: { filter: vipFilter } };

function vipMembers() {
  return fakeMembers(({ filter }) =>
    filter
      ? [member({ name: 'Vip One', labels: [vip] })]
      : [member({ name: 'Vip One', labels: [vip] }), member({ name: 'Plain' })],
  );
}

describe('Members saved views', () => {
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
});
