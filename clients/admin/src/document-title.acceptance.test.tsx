import { describe, expect, it } from 'vitest';

import {
  fakeEditSettings,
  fakeSettingsScreens,
  renderAdminApp,
  siteResponse,
} from '@test-utils/acceptance';
import { settingsScreen } from '@/settings/settings.screen';

describe('Document title', () => {
  it('shows the site title', async () => {
    const site = siteResponse();
    site.site.title = 'My Publication';

    await renderAdminApp('/site', { boot: { browseSite: { response: site } } });

    await expect.poll(() => document.title).toBe('Ghost Admin - My Publication');
  });

  it('follows a saved site title', async () => {
    fakeSettingsScreens();
    const settingsApi = fakeEditSettings();
    await renderAdminApp('/settings', {
      boot: {
        browseSite: {
          response: () => {
            const site = siteResponse();
            const saved = settingsApi.lastRequest?.settings.find(({ key }) => key === 'title');
            if (typeof saved?.value === 'string') {
              site.site.title = saved.value;
            }
            return site;
          },
        },
      },
    });
    await expect.poll(() => document.title).toBe('Ghost Admin - Test Site');

    const section = settingsScreen.titleAndDescription();
    await section.getByRole('button', { name: 'Edit' }).click();
    await section.getByLabelText('Site title').fill('Renamed Site');
    await section.getByRole('button', { name: 'Save' }).click();

    await expect.poll(() => document.title).toBe('Ghost Admin - Renamed Site');
  });
});
