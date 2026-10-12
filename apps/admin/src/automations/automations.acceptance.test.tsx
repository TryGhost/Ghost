import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';

import { automation, fakeAutomations, renderAdminApp } from '@test-utils/acceptance';
import { automationsScreen } from './automations.screen';

// Automations ships behind the `automations` beta labs flag.
const AUTOMATIONS_ENABLED = { labs: { automations: true } };

describe('Automations list', () => {
  it('renders the automations page', async () => {
    fakeAutomations([]);
    await renderAdminApp('/automations', AUTOMATIONS_ENABLED);

    await expect.element(automationsScreen.heading()).toBeVisible();
    await expect.element(automationsScreen.columnHeader('Last started')).toBeVisible();
  });

  it('lists the welcome automations', async () => {
    fakeAutomations([
      automation({
        name: 'Free member welcome flow',
        description: 'Greet new free members.',
        slug: 'member-welcome-email-free',
        status: 'active',
        stats: {
          last_run_created_at: '2026-07-21T07:12:00.000Z',
          total_run_count: 1432,
          in_progress_run_count: 118,
        },
      }),
      automation({
        name: 'Paid member welcome flow',
        slug: 'member-welcome-email-paid',
        status: 'inactive',
        stats: {
          last_run_created_at: null,
          total_run_count: 0,
          in_progress_run_count: 0,
        },
      }),
    ]);
    await renderAdminApp('/automations', AUTOMATIONS_ENABLED);

    await expect.element(automationsScreen.link('Free member welcome flow')).toBeVisible();
    await expect.element(automationsScreen.columnHeader('Last started')).toBeVisible();
    await expect.element(automationsScreen.columnHeader('Total runs')).toBeVisible();
    await expect.element(automationsScreen.columnHeader('In progress')).toBeVisible();
    const row = automationsScreen.rows();
    await expect.element(row).toHaveTextContent('Greet new free members.');
    await expect.element(row).toHaveTextContent('1,432');
    await expect.element(row).toHaveTextContent('118');
    await expect.element(row).toHaveTextContent('Live');
    // Stripe is disconnected in the default boot, which hides the paid welcome flow.
    await expect(automationsScreen.rows()).toHaveCount(1);
  });

  it('hides run analytics when the backend does not return stats', async () => {
    fakeAutomations([
      automation({
        name: 'Free member welcome flow',
        slug: 'member-welcome-email-free',
        status: 'active',
        stats: undefined,
      }),
    ]);
    await renderAdminApp('/automations', AUTOMATIONS_ENABLED);

    await expect.element(automationsScreen.link('Free member welcome flow')).toBeVisible();
    await expect.element(automationsScreen.columnHeader('Last started')).not.toBeInTheDocument();
    await expect.element(automationsScreen.columnHeader('Total runs')).not.toBeInTheDocument();
    await expect.element(automationsScreen.columnHeader('In progress')).not.toBeInTheDocument();
  });

  it('filters archived automations', async () => {
    fakeAutomations([
      automation({ id: 'live', name: 'Live flow', status: 'active' }),
      automation({ id: 'off', name: 'Off flow', status: 'inactive' }),
      automation({ id: 'archived', name: 'Archived flow', status: 'archived' }),
      automation({
        id: 'paid',
        name: 'Hidden paid flow',
        slug: 'member-welcome-email-paid',
        status: 'archived',
      }),
    ]);

    await renderAdminApp('/automations', {
      labs: { automations: true, automationsPerTier: true },
    });
    const filter = () => page.getByRole('combobox', { name: 'Automations to show' });

    await expect.element(filter()).toHaveTextContent('Active automations');
    await expect(automationsScreen.rows()).toHaveCount(2);
    await expect.element(automationsScreen.link('Live flow')).toBeVisible();
    await expect.element(automationsScreen.link('Off flow')).toBeVisible();

    await filter().click();
    await expect(page.getByRole('option')).toHaveCount(3);

    await page.getByRole('option', { name: 'Archived automations', exact: true }).click();
    await expect(automationsScreen.rows()).toHaveCount(1);
    await expect.element(automationsScreen.link('Archived flow')).toBeVisible();

    await filter().click();
    await page.getByRole('option', { name: 'All automations', exact: true }).click();
    await expect(automationsScreen.rows()).toHaveCount(3);
  });

  it('omits the filter when archived automations are hidden by Stripe', async () => {
    fakeAutomations([
      automation({ name: 'Free flow', status: 'inactive' }),
      automation({ name: 'Paid flow', slug: 'member-welcome-email-paid', status: 'archived' }),
    ]);

    await renderAdminApp('/automations', AUTOMATIONS_ENABLED);

    await expect(automationsScreen.rows()).toHaveCount(1);
    await expect(page.getByRole('combobox', { name: 'Automations to show' })).toHaveCount(0);
  });
});
