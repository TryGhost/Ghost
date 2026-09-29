import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import {
  configResponse,
  fakeAdminEndpoint,
  renderAdminApp,
  settingsResponse,
  type RenderAdminAppOptions,
} from '@test-utils/acceptance';
import { sidebarScreen } from '@/layout/sidebar.screen';

/** The flag as given, or — for a backend that predates it — missing from both labs sources. */
function withFlag(enabled: boolean | undefined): RenderAdminAppOptions {
  if (enabled !== undefined) {
    return { labs: { membersActivityReact: enabled } };
  }
  const config = configResponse();
  delete config.config.labs?.membersActivityReact;
  const settings = settingsResponse();
  const labsSetting = settings.settings.find(({ key }) => key === 'labs')!;
  const labs = JSON.parse(labsSetting.value as string) as Record<string, boolean>;
  delete labs.membersActivityReact;
  labsSetting.value = JSON.stringify(labs);
  return { boot: { browseConfig: { response: config }, browseSettings: { response: settings } } };
}

describe('Member activity route ownership', () => {
  it.each([false, undefined])('leaves the page with Ember when the flag is %s', async (enabled) => {
    const events = fakeAdminEndpoint('GET', /^\/members\/events\//, { events: [] });
    await renderAdminApp('/members-activity', withFlag(enabled));

    // There is no Ember runtime in this tier; the shell moves its host out of
    // `body` and exposes it instead — for every route until the current user
    // loads, hence the sidebar wait. The real off-flag UI journey is covered by browser E2E.
    await expect.element(sidebarScreen.shellNav()).toBeVisible();
    await expect
      .poll(() => {
        const emberRoot = document.getElementById('ember-app')?.parentElement;
        return emberRoot && emberRoot !== document.body ? emberRoot.hidden : undefined;
      })
      .toBe(false);
    await expect
      .element(page.getByRole('heading', { name: 'Member activity' }))
      .not.toBeInTheDocument();
    expect(events.requests).toHaveLength(0);
  });
});
