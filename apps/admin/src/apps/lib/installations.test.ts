import {
  getInstallation,
  installApp,
  isInstallationActive,
  resetInstallationsCache,
  uninstallApp,
  updateInstallationManifest,
} from './installations';

const manifest = {
  name: 'Content calendar',
  url: 'https://calendar.example/',
  surfaces: ['page' as const],
};

describe('installations', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetInstallationsCache();
  });

  it('keeps an uninstalled installation on record instead of deleting it', () => {
    const installation = installApp('https://calendar.example/manifest.json', manifest);
    uninstallApp(installation.id);

    expect(isInstallationActive(installation.id)).toBe(false);
    expect(getInstallation(installation.id)?.status).toBe('uninstalled');
  });

  it('creates a new installation on reinstall and never revives the old one', () => {
    const first = installApp('https://calendar.example/manifest.json', manifest);
    uninstallApp(first.id);
    const second = installApp('https://calendar.example/manifest.json', manifest);

    expect(second.id).not.toBe(first.id);
    expect(isInstallationActive(first.id)).toBe(false);
    expect(isInstallationActive(second.id)).toBe(true);
  });

  it('applies a refreshed manifest only while the installation is active', () => {
    const installation = installApp('https://calendar.example/manifest.json', manifest);
    updateInstallationManifest(installation.id, { ...manifest, icon: 'calendar-days' });
    expect(getInstallation(installation.id)?.manifest.icon).toBe('calendar-days');

    uninstallApp(installation.id);
    updateInstallationManifest(installation.id, { ...manifest, name: 'Renamed' });
    expect(getInstallation(installation.id)?.manifest.name).toBe('Content calendar');
    expect(getInstallation(installation.id)?.status).toBe('uninstalled');
  });
});
