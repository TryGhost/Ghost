import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { renderAdminApp } from '@test-utils/acceptance';
import { flags, open, setup } from './run-history.test-utils';

describe('Automation run sort controls', () => {
  it('offers Entered sorting while Member and Status remain plain headings', async () => {
    setup();
    await renderAdminApp('/automations/first', flags);
    await open();
    const region = page.getByRole('region', { name: 'Automation runs', exact: true });
    await expect
      .element(region.getByRole('button', { name: 'Entered', exact: true }))
      .toBeVisible();
    for (const name of ['Member', 'Status']) {
      await expect.element(region.getByRole('columnheader', { name, exact: true })).toBeVisible();
      await expect
        .element(region.getByRole('button', { name, exact: true }))
        .not.toBeInTheDocument();
      await expect
        .element(region.getByRole('columnheader', { name, exact: true }))
        .not.toHaveAttribute('aria-sort');
    }
  });
});
