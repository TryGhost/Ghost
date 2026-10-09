import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import {
  automation,
  fakeAdminEndpoint,
  fakeAutomations,
  renderAdminApp,
} from '@test-utils/acceptance';
import type {
  AutomationDetail,
  AutomationStatus,
} from '@tryghost/admin-x-framework/api/automations';
import { detail } from './run-history.test-utils';
import { automationsScreen } from './automations.screen';

const flags = { labs: { automations: true, automationsArchive: true } };
const dialog = () => page.getByRole('alertdialog');
const actions = () => page.getByRole('button', { name: 'Actions for Welcome series' });

const setup = (status: AutomationStatus = 'inactive') => {
  let saved = { ...detail('first'), status };
  fakeAutomations(() => [
    automation({
      id: saved.id,
      name: saved.name,
      description: saved.description,
      slug: 'member-welcome-email-free',
      status: saved.status,
    }),
  ]);
  const saveStatus = (nextStatus: AutomationStatus) => {
    saved = { ...saved, status: nextStatus };
    return { automations: [saved] };
  };
  const read = fakeAdminEndpoint('GET', '/automations/first/', () => ({ automations: [saved] }));
  const edit = fakeAdminEndpoint('PUT', '/automations/first/', ({ body }) => {
    const payload = (body as { automations: Partial<AutomationDetail>[] }).automations[0];
    return saveStatus(payload.status ?? saved.status);
  });
  return { edit, read, saveStatus };
};

const openConfirmation = async (label: 'Turn off') => {
  await actions().click();
  await expect(page.getByRole('menuitem')).toHaveCount(2);
  await page.getByRole('menuitem', { name: label, exact: true }).click();
  await expect.element(dialog()).toBeVisible();
};

describe('Automation list status actions', () => {
  it.each([
    { status: 'active' as const, enabled: false, items: [] },
    { status: 'active' as const, enabled: true, items: ['Turn off', 'Archive'] },
    { status: 'inactive' as const, enabled: false, items: [] },
    { status: 'inactive' as const, enabled: true, items: ['Archive'] },
    { status: 'archived' as const, enabled: false, items: [] },
    { status: 'archived' as const, enabled: true, items: ['Unarchive'] },
  ])(
    'shows valid actions for $status with archive flag=$enabled',
    async ({ status, enabled, items }) => {
      const { edit } = setup(status);
      await renderAdminApp('/automations', {
        labs: { automations: true, automationsArchive: enabled },
      });

      if (status === 'archived') {
        await page.getByRole('combobox', { name: 'Automations to show' }).click();
        await page.getByRole('option', { name: 'Archived automations', exact: true }).click();
      }

      await expect(page.getByTestId('automation-list-row')).toHaveCount(1);
      if (items.length === 0) {
        await expect(actions()).toHaveCount(0);
        await expect(page.getByRole('columnheader', { name: 'Actions' })).toHaveCount(0);
      } else {
        await actions().click();
        await expect(page.getByRole('menuitem')).toHaveCount(items.length);
        for (const name of items) {
          await expect.element(page.getByRole('menuitem', { name, exact: true })).toBeVisible();
        }
      }
      expect(edit.requests).toHaveLength(0);
    },
  );

  it.each([
    { status: 'active' as const, action: 'Archive', nextStatus: 'archived' },
    { status: 'inactive' as const, action: 'Archive', nextStatus: 'archived' },
    { status: 'archived' as const, action: 'Unarchive', nextStatus: 'inactive' },
  ])('$action saves only status and refreshes the list', async ({ status, action, nextStatus }) => {
    const { edit, read } = setup(status);
    await renderAdminApp('/automations', { labs: { automations: true, automationsArchive: true } });

    if (status === 'archived') {
      await page.getByRole('combobox', { name: 'Automations to show' }).click();
      await page.getByRole('option', { name: 'All automations', exact: true }).click();
    }
    await actions().click();
    await page.getByRole('menuitem', { name: action, exact: true }).click();

    await expect.poll(() => edit.requests.length).toBe(1);
    expect(edit.requests[0].body).toEqual({ automations: [{ status: nextStatus }] });
    if (nextStatus === 'archived') {
      await expect(page.getByTestId('automation-list-row')).toHaveCount(0);
      await page.getByRole('combobox', { name: 'Automations to show' }).click();
      await page.getByRole('option', { name: 'Archived automations', exact: true }).click();
    }
    await expect
      .element(page.getByTestId('automation-list-row'))
      .toHaveTextContent(nextStatus === 'archived' ? 'Archived' : 'Off');
    expect(read.requests).toHaveLength(0);
    await expect.element(automationsScreen.heading()).toBeVisible();
  });

  it('keeps failed archiving unchanged and allows retry from the menu', async () => {
    const { saveStatus } = setup();
    let fail = true;
    const edit = fakeAdminEndpoint('PUT', '/automations/first/', () =>
      fail
        ? new Response(
            JSON.stringify({ errors: [{ message: 'Cannot archive.', type: 'ValidationError' }] }),
            {
              status: 422,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        : saveStatus('archived'),
    );
    await renderAdminApp('/automations', { labs: { automations: true, automationsArchive: true } });

    await actions().click();
    await page.getByRole('menuitem', { name: 'Archive', exact: true }).click();
    await expect
      .element(page.getByText('Automation couldn’t be saved', { exact: true }))
      .toBeVisible();
    await expect.element(page.getByTestId('automation-list-row')).toHaveTextContent('Off');
    await expect.element(actions()).toBeEnabled();
    await expect(dialog()).toHaveCount(0);

    fail = false;
    await actions().click();
    await page.getByRole('menuitem', { name: 'Archive', exact: true }).click();
    await expect.poll(() => edit.requests.length).toBe(2);
    expect(edit.requests[1].body).toEqual({ automations: [{ status: 'archived' }] });
    await expect(page.getByTestId('automation-list-row')).toHaveCount(0);
    await page.getByRole('combobox', { name: 'Automations to show' }).click();
    await page.getByRole('option', { name: 'Archived automations', exact: true }).click();
    await expect.element(page.getByTestId('automation-list-row')).toHaveTextContent('Archived');
  });

  it('disables the action menu while archiving', async () => {
    const { saveStatus } = setup();
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const edit = fakeAdminEndpoint('PUT', '/automations/first/', async () => {
      await pending;
      return saveStatus('archived');
    });
    await renderAdminApp('/automations', { labs: { automations: true, automationsArchive: true } });

    await actions().click();
    await page.getByRole('menuitem', { name: 'Archive', exact: true }).click();
    try {
      await expect.element(actions()).toBeDisabled();
      await expect.poll(() => edit.requests.length).toBe(1);
    } finally {
      release();
    }
    await expect(page.getByTestId('automation-list-row')).toHaveCount(0);
    await page.getByRole('combobox', { name: 'Automations to show' }).click();
    await page.getByRole('option', { name: 'Archived automations', exact: true }).click();
    await expect.element(page.getByTestId('automation-list-row')).toHaveTextContent('Archived');
    await expect.element(actions()).toBeEnabled();
  });

  it('opens the menu and confirmation on narrow screens', async () => {
    setup('active');
    await page.viewport(400, 800);
    try {
      await renderAdminApp('/automations', flags);
      await actions().click();
      await expect.element(page.getByRole('menuitem', { name: 'Turn off' })).toBeVisible();
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(400);
      await page.getByRole('menuitem', { name: 'Turn off' }).click();
      await expect.element(dialog()).toBeVisible();
      await dialog().getByRole('button', { name: 'Cancel' }).click();
      await expect.element(automationsScreen.heading()).toBeVisible();
    } finally {
      await page.viewport(1280, 800);
    }
  });

  it.each([
    {
      status: 'active' as const,
      menu: 'Turn off' as const,
      title: 'Turn off automation?',
      button: 'Turn off',
      nextStatus: 'inactive',
      badge: 'Off',
    },
  ])(
    'confirms $menu and refreshes the list without opening the editor',
    async ({ status, menu, title, button, nextStatus, badge }) => {
      const { edit, read } = setup(status);
      await renderAdminApp('/automations', flags);
      await openConfirmation(menu);
      await expect.element(dialog().getByRole('heading', { name: title })).toBeVisible();
      expect(edit.requests).toHaveLength(0);
      await dialog().getByRole('button', { name: button, exact: true }).click();
      await expect(dialog()).toHaveCount(0);
      await expect.poll(() => edit.requests.length).toBe(1);
      expect(edit.requests[0].body).toEqual({ automations: [{ status: nextStatus }] });
      await expect.element(page.getByTestId('automation-list-row')).toHaveTextContent(badge);
      expect(read.requests).toHaveLength(0);
      await expect.element(automationsScreen.heading()).toBeVisible();
    },
  );

  it('cancels without saving and restores keyboard focus to the actions button', async () => {
    const { edit } = setup('active');
    await renderAdminApp('/automations', flags);
    await expect.element(actions()).toBeVisible();
    (actions().element() as HTMLButtonElement).focus();
    await userEvent.keyboard('{Enter}');
    await expect.element(page.getByRole('menuitem', { name: 'Turn off' })).toBeVisible();
    await userEvent.keyboard('{Enter}');
    await expect.element(dialog()).toBeVisible();
    await dialog().getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog()).toHaveCount(0);
    expect(edit.requests).toHaveLength(0);
    await expect.element(actions()).toHaveFocus();
  });

  it('keeps failed deactivation open and offers retry without changing status', async () => {
    const { saveStatus } = setup('active');
    let fail = true;
    const edit = fakeAdminEndpoint('PUT', '/automations/first/', () =>
      fail
        ? new Response(
            JSON.stringify({
              errors: [{ message: 'Add an email body.', type: 'ValidationError' }],
            }),
            { status: 422, headers: { 'Content-Type': 'application/json' } },
          )
        : saveStatus('inactive'),
    );
    await renderAdminApp('/automations', flags);
    await openConfirmation('Turn off');
    await dialog().getByRole('button', { name: 'Turn off', exact: true }).click();
    await expect.element(dialog().getByRole('button', { name: 'Retry' })).toBeVisible();
    await expect.element(page.getByTestId('automation-list-row')).toHaveTextContent('Live');
    expect(edit.requests).toHaveLength(1);
    fail = false;
    await dialog().getByRole('button', { name: 'Retry' }).click();
    await expect(dialog()).toHaveCount(0);
    await expect.poll(() => edit.requests.length).toBe(2);
    await expect.element(page.getByTestId('automation-list-row')).toHaveTextContent('Off');
  });

  it('prevents dismissal and duplicate writes while saving', async () => {
    const { saveStatus } = setup('active');
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const edit = fakeAdminEndpoint('PUT', '/automations/first/', async () => {
      await pending;
      return saveStatus('inactive');
    });
    await renderAdminApp('/automations', flags);
    await openConfirmation('Turn off');
    await dialog().getByRole('button', { name: 'Turn off', exact: true }).click();
    try {
      await expect.element(dialog().getByRole('button', { name: 'Cancel' })).toBeDisabled();
      await expect.element(dialog().getByRole('button', { name: 'Turning off...' })).toBeDisabled();
      await userEvent.keyboard('{Escape}');
      await expect.element(dialog()).toBeVisible();
      expect(edit.requests).toHaveLength(1);
    } finally {
      release();
    }
    await expect(dialog()).toHaveCount(0);
    await expect.element(page.getByTestId('automation-list-row')).toHaveTextContent('Off');
  });
});
