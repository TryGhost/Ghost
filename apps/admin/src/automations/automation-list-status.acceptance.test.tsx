import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import {
  automation,
  fakeAdminEndpoint,
  fakeAutomations,
  renderAdminApp,
} from '@test-utils/acceptance';
import { automationsScreen } from './automations.screen';

describe('Automation list status actions', () => {
  it.each(['active', 'inactive'] as const)(
    'omits the actions column for %s automations',
    async (status) => {
      fakeAutomations([automation({ id: 'first', name: 'Welcome series', status })]);
      const edit = fakeAdminEndpoint('PUT', '/automations/first/', () => ({ automations: [] }));

      await renderAdminApp('/automations', { labs: { automations: true } });

      await expect.element(automationsScreen.heading()).toBeVisible();
      await expect.element(automationsScreen.link('Welcome series')).toBeVisible();
      await expect(
        page.getByRole('button', {
          name: 'Actions for Welcome series',
          includeHidden: true,
        }),
      ).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Actions for Welcome series' })).toHaveCount(0);
      await expect(page.getByRole('menuitem')).toHaveCount(0);
      await expect(page.getByRole('alertdialog')).toHaveCount(0);
      expect(edit.requests).toHaveLength(0);
    },
  );
});
