import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { configResponse, fakeAdminEndpoint, renderAdminApp } from '@test-utils/acceptance';

describe('Member activity route ownership', () => {
  it.each([false, undefined])('leaves the page with Ember when the flag is %s', async (enabled) => {
    const config = configResponse();
    config.config.labs ??= {};
    if (enabled === undefined) {
      delete config.config.labs.membersActivityReact;
    } else {
      config.config.labs.membersActivityReact = enabled;
    }
    const events = fakeAdminEndpoint('GET', /^\/members\/events\//, { events: [] });
    await renderAdminApp('/members-activity', {
      boot: { browseConfig: { response: config } },
    });

    // There is no Ember runtime in this tier; the shell exposes its host
    // instead. The real off-flag UI journey is covered by browser E2E.
    await expect
      .poll(() => document.getElementById('ember-app')?.parentElement?.hidden)
      .toBe(false);
    await expect
      .element(page.getByRole('heading', { name: 'Member activity' }))
      .not.toBeInTheDocument();
    expect(events.requests).toHaveLength(0);
  });
});
