import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import {
  currentRoute,
  currentUserResponse,
  fakeAdminStats,
  fakeAnalyticsOverview,
  fakeAutomations,
  fakeFrameOrigin,
  fakeTags,
  fakeTinybirdPipe,
  fakeTinybirdToken,
  renderAdminApp,
  settingsResponse,
  siteResponse,
  staffRole,
  webAnalyticsBootOverrides,
  type RenderAdminAppOptions,
} from '@test-utils/acceptance';
import type { StaffRoleName } from '@tryghost/test-data';
import { adminFrameScreen } from './admin-frame.screen';
import { sidebarScreen } from './sidebar.screen';

/** admin7Design on, as the given staff role, with any further boot overrides. */
function framed({
  role,
  boot = {},
}: { role?: StaffRoleName; boot?: RenderAdminAppOptions['boot'] } = {}): RenderAdminAppOptions {
  const me = currentUserResponse();
  if (role) {
    me.users[0].roles = [staffRole({ name: role })];
  }
  return { labs: { admin7Design: true }, boot: { browseMe: { response: me }, ...boot } };
}

describe('Admin 7 frame top bar', () => {
  it('is left out, asking for no numbers, with admin7Design off', async () => {
    fakeTags([]);
    const memberCount = fakeAdminStats.memberCount();
    const mrr = fakeAdminStats.mrr();
    await renderAdminApp('/tags', { labs: { admin7Design: false } });

    // The docked sidebar keeps View site and search, which the frame takes over
    await expect.element(sidebarScreen.navLink('View site')).toBeVisible();
    await expect
      .element(sidebarScreen.shellNav().getByRole('button', { name: /Search site/ }))
      .toBeVisible();
    await expect.element(adminFrameScreen.topBar()).not.toBeInTheDocument();
    expect(memberCount.requests).toHaveLength(0);
    expect(mrr.requests).toHaveLength(0);
  });

  it('shows the current members and MRR, in the currency that brings in the most', async () => {
    fakeTags([]);
    const memberCount = fakeAdminStats.memberCount({
      totals: { free: 800, paid: 150, comped: 40, gift: 10 },
    });
    fakeAdminStats.mrr({
      totals: [
        { currency: 'eur', mrr: 5000 },
        { currency: 'usd', mrr: 93700 },
      ],
    });
    await renderAdminApp('/tags', framed());

    await expect.element(adminFrameScreen.stat('Members')).toHaveTextContent(/1,000/);
    await expect.element(adminFrameScreen.stat('MRR')).toHaveTextContent(/\$937/);
    // Only the current totals are needed, so only today's history is asked for
    expect(memberCount.lastRequest?.url).toContain('date_from=');
  });

  it('leaves MRR out, without asking for it, when paid members are off', async () => {
    fakeTags([]);
    fakeAdminStats.memberCount({ totals: { free: 5, paid: 0, comped: 0, gift: 0 } });
    const mrr = fakeAdminStats.mrr();
    await renderAdminApp(
      '/tags',
      framed({
        boot: {
          browseSettings: {
            response: settingsResponse({ settings: { paid_members_enabled: false } }),
          },
        },
      }),
    );

    await expect.element(adminFrameScreen.stat('Members')).toHaveTextContent(/5/);
    await expect.element(adminFrameScreen.stat('MRR')).not.toBeInTheDocument();
    expect(mrr.requests).toHaveLength(0);
  });

  it('shows the visitors online from Tinybird when web analytics is on', async () => {
    fakeTags([]);
    fakeAdminStats.memberCount();
    fakeAdminStats.mrr();
    fakeTinybirdToken();
    fakeTinybirdPipe('api_active_visitors', [{ active_visitors: 12 }]);
    await renderAdminApp('/tags', framed({ boot: webAnalyticsBootOverrides() }));

    await expect.element(adminFrameScreen.stat('Online')).toHaveTextContent(/12 Online/i);
  });

  it('leaves Online out when web analytics is off', async () => {
    fakeTags([]);
    fakeAdminStats.memberCount();
    fakeAdminStats.mrr();
    await renderAdminApp('/tags', framed());

    await expect.element(adminFrameScreen.stat('Members')).toBeVisible();
    await expect.element(adminFrameScreen.stat('Online')).not.toBeInTheDocument();
  });

  it('shows no numbers, and asks for none, to staff without admin access', async () => {
    fakeTags([]);
    const memberCount = fakeAdminStats.memberCount();
    const mrr = fakeAdminStats.mrr();
    await renderAdminApp('/tags', framed({ role: 'Editor' }));

    await expect.element(adminFrameScreen.place('Ghost')).toBeVisible();
    await expect.element(adminFrameScreen.stat('Members')).not.toBeInTheDocument();
    await expect.element(adminFrameScreen.stat('MRR')).not.toBeInTheDocument();
    expect(memberCount.requests).toHaveLength(0);
    expect(mrr.requests).toHaveLength(0);
  });

  it('switches between Ghost and View site with Option + 1 and Option + 2', async () => {
    const siteOrigin = new URL(String(siteResponse().site.url)).origin;
    await fakeFrameOrigin(siteOrigin, '<!doctype html>');
    fakeTags([]);
    fakeAnalyticsOverview();
    await renderAdminApp('/tags', framed());
    await expect.element(adminFrameScreen.place('Ghost')).toHaveAttribute('aria-current', 'page');

    await userEvent.keyboard('{Alt>}2{/Alt}');
    await expect.poll(currentRoute).toBe('/site');
    await expect
      .element(adminFrameScreen.place('View site'))
      .toHaveAttribute('aria-current', 'page');

    await userEvent.keyboard('{Alt>}1{/Alt}');
    // Home, which sends an admin on to Analytics
    await expect.poll(currentRoute).toBe('/analytics');
    await expect.element(adminFrameScreen.place('Ghost')).toHaveAttribute('aria-current', 'page');
  });

  it('keeps its places out of reach while the frame is closed around a full-screen surface', async () => {
    fakeAutomations([]);
    fakeAdminStats.memberCount();
    fakeAdminStats.mrr();
    await renderAdminApp('/automations/new', {
      ...framed(),
      labs: {
        admin7Design: true,
        automations: true,
        automationsPerTier: true,
        automationRunAnalytics: true,
      },
    });
    await expect.element(page.getByRole('button', { name: 'Add step', exact: true })).toBeVisible();

    await userEvent.keyboard('{Alt>}2{/Alt}');

    expect(currentRoute()).toBe('/automations/new');
    expect(adminFrameScreen.topBar().element().closest('[inert]')).not.toBeNull();
  });
});
