import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';

import {
  configResponse,
  fakeAdminEndpoint,
  fakeSettingsScreens,
  renderAdminApp,
} from '@test-utils/acceptance';

const screen = {
  label: (name: string) => page.getByText(`${name}:`, { exact: true }),
  versionLink: (version: string) => page.getByRole('link', { name: version, exact: true }),
};

function configWithVersion(version: string) {
  const response = configResponse();
  return { config: { ...response.config, version } };
}

describe('About', () => {
  beforeEach(() => {
    // About opens over the Settings page, which loads its own sections.
    fakeSettingsScreens();
    fakeAdminEndpoint('GET', '/upgrades/', {
      upgrades: [{ supported: false, reason: 'not-configured' }],
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('shows one version when Admin was built without a build version', async () => {
    vi.stubEnv('GHOST_BUILD_VERSION', '');
    await renderAdminApp('/settings/about');

    await expect.element(screen.label('Version')).toBeVisible();
    await expect
      .element(screen.versionLink('6.52.1'))
      .toHaveAttribute('href', 'https://github.com/TryGhost/Ghost/releases/tag/v6.52.1');
    await expect.element(screen.label('Server')).not.toBeInTheDocument();
    await expect.element(screen.label('Admin')).not.toBeInTheDocument();
  });

  it('shows the server and Admin versions when Admin has a build version', async () => {
    vi.stubEnv('GHOST_BUILD_VERSION', '6.52.1+abc1234');
    await renderAdminApp('/settings/about', {
      boot: { browseConfig: { response: configWithVersion('6.52.1+def5678') } },
    });

    await expect.element(page.getByText('Server: 6.52.1+def5678')).toBeVisible();
    await expect
      .element(screen.versionLink('6.52.1+def5678'))
      .toHaveAttribute('href', 'https://github.com/TryGhost/Ghost/commit/def5678');
    await expect.element(page.getByText('Admin: 6.52.1+abc1234')).toBeVisible();
    await expect
      .element(screen.versionLink('6.52.1+abc1234'))
      .toHaveAttribute('href', 'https://github.com/TryGhost/Ghost/commit/abc1234');
    await expect.element(screen.label('Version')).not.toBeInTheDocument();
  });
});
