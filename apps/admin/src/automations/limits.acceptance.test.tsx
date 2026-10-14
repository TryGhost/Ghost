import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { fakeAdminEndpoint, renderAdminApp } from '@test-utils/acceptance';
import { composeConfigBootOverrides } from '@test-utils/acceptance/boot';
import { detail, setup, flags } from './run-history.test-utils';

const limitMessage = 'Your plan allows {{max}} active automations.';
const boot = (max: number | undefined) => ({
  ...flags,
  boot: composeConfigBootOverrides(
    {
      hostSettings: {
        limits: max === undefined ? {} : { limitAutomations: { max, error: limitMessage } },
      },
    },
    flags.boot,
  ),
});
const publish = async () => {
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Publish', exact: true }).click();
};
const counts = (statuses: string[]) =>
  fakeAdminEndpoint('GET', /^\/automations\/(\?|$)/, {
    automations: statuses.map((status, i) => ({ ...detail(`count-${i}`), status })),
  });

describe('Automation plan limits', () => {
  it.each([0, 1])('blocks activation at cap %s before sending edit', async (max) => {
    setup();
    counts(Array.from({ length: max }, () => 'active'));
    const edit = fakeAdminEndpoint('PUT', '/automations/first/', {
      automations: [{ ...detail('first'), status: 'active' }],
    });
    await renderAdminApp('/automations/first', boot(max));
    await publish();
    await expect
      .element(page.getByTestId('limit-modal'))
      .toHaveTextContent(`Your plan allows ${max} active automations.`);
    expect(edit.requests).toHaveLength(0);
  });

  it.each([undefined, 2])('allows activation with limit %s and ignores drafts', async (max) => {
    setup();
    const reads = counts(['active', 'inactive', 'inactive']);
    const edit = fakeAdminEndpoint('PUT', '/automations/first/', {
      automations: [{ ...detail('first'), status: 'active' }],
    });
    await renderAdminApp('/automations/first', boot(max));
    await publish();
    await expect.poll(() => edit.requests.length).toBe(1);
    expect(reads.requests).toHaveLength(max === undefined ? 0 : 1);
    await expect
      .element(page.getByRole('button', { name: 'Published', exact: true }))
      .toBeVisible();
  });

  it.each(['Save', 'Publish changes', 'Turn off'])(
    'allows %s at cap without fetching counts',
    async (button) => {
      setup();
      const active = button !== 'Save';
      const saved = {
        ...detail('first'),
        status: active ? ('active' as const) : ('inactive' as const),
      };
      fakeAdminEndpoint('GET', '/automations/first/', { automations: [saved] });
      const reads = counts(['active']);
      const edit = fakeAdminEndpoint('PUT', '/automations/first/', { automations: [saved] });
      await renderAdminApp('/automations/first', boot(1));
      await page
        .getByRole('article', { name: /^Wait:/ })
        .getByRole('textbox', { name: 'Wait for', exact: true })
        .fill('2');
      await page.getByRole('button', { name: button, exact: true }).click();
      if (button !== 'Save') {
        await page
          .getByRole('alertdialog')
          .getByRole('button', { name: button, exact: true })
          .click();
      }
      await expect.poll(() => edit.requests.length).toBe(1);
      expect(reads.requests).toHaveLength(0);
    },
  );

  it.each([
    { button: 'Save', max: 1 },
    { button: 'Publish', max: 1 },
    { button: 'Save', max: undefined },
    { button: 'Publish', max: undefined },
  ])('handles new automation $button with limit $max', async ({ button, max }) => {
    const reads = counts(['active']);
    let readsAtCreate: number | undefined;
    const create = fakeAdminEndpoint('POST', '/automations/', ({ body }) => {
      readsAtCreate = reads.requests.length;
      return {
        automations: [
          {
            ...detail('created'),
            ...(body as { automations: object[] }).automations[0],
            id: 'created',
          },
        ],
      };
    });
    await renderAdminApp('/automations/new', boot(max));
    await page.getByRole('button', { name: 'Add step', exact: true }).click();
    await page.getByTestId('step-picker').getByRole('button', { name: /^Wait/ }).click();
    // Creation reads the list for naming and the existing total-automation cap.
    const initialReads = reads.requests.length;
    if (button === 'Publish') {
      await publish();
      if (max === undefined) {
        await expect.poll(() => create.requests.length).toBe(1);
        expect(create.requests[0].body).toMatchObject({ automations: [{ status: 'active' }] });
      } else {
        await expect
          .element(page.getByTestId('limit-modal'))
          .toHaveTextContent('Your plan allows 1 active automations.');
        expect(create.requests).toHaveLength(0);
      }
    } else {
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await expect.poll(() => create.requests.length).toBe(1);
      expect(create.requests[0].body).toMatchObject({ automations: [{ status: 'inactive' }] });
    }
    // Capture before mutation invalidation can refetch the creation list.
    expect(readsAtCreate ?? reads.requests.length).toBe(
      initialReads + (button === 'Publish' && max !== undefined ? 1 : 0),
    );
  });

  it('blocks activation when the count request fails', async () => {
    setup();
    fakeAdminEndpoint('GET', /^\/automations\/(\?|$)/, () => new Response(null, { status: 500 }));
    const edit = fakeAdminEndpoint('PUT', '/automations/first/', {
      automations: [detail('first')],
    });
    await renderAdminApp('/automations/first', boot(1));
    await publish();
    await expect.element(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
    expect(edit.requests).toHaveLength(0);
  });

  it('shows the limit dialog when the backend rejects an activation race', async () => {
    setup();
    counts([]);
    fakeAdminEndpoint(
      'PUT',
      '/automations/first/',
      () =>
        new Response(
          JSON.stringify({
            errors: [
              {
                type: 'HostLimitError',
                message: 'Host Limit error, cannot save automation.',
                context: 'Active automation limit reached.',
              },
            ],
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } },
        ),
    );
    await renderAdminApp('/automations/first', boot(1));
    await publish();
    await expect
      .element(page.getByTestId('limit-modal'))
      .toHaveTextContent('Active automation limit reached.');
  });
});
