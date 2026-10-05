import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { fakeAdminEndpoint, renderAdminApp } from '@test-utils/acceptance';
import {
  flags,
  detail,
  history,
  setup,
  respond,
  canvas,
  select,
  open,
  close,
} from './run-history.test-utils';

const lexical = JSON.stringify({
  root: {
    children: [
      {
        type: 'paragraph',
        children: [
          {
            type: 'extended-text',
            text: 'Welcome back. Here is <b>literal text</b> from the original email.',
          },
        ],
      },
    ],
  },
});

describe('Historical email snippets', () => {
  it('shows the saved revision as plain text while leaving the current email draft intact', async () => {
    setup();
    fakeAdminEndpoint('GET', '/automations/first/', {
      automations: [
        {
          ...detail('first'),
          actions: [
            {
              id: 'email',
              type: 'send_email',
              data: {
                email_subject: 'Current subject',
                email_lexical: lexical,
                email_design_setting_id: 'design',
              },
            },
          ],
        },
      ],
    });
    const data = history('a');
    data.steps[0].action = {
      id: 'email',
      type: 'send_email',
      data: {
        email_subject: 'Original subject',
        email_lexical: lexical,
      },
    };
    respond(data);
    await renderAdminApp('/automations/first', flags);
    await page.getByRole('textbox', { name: 'Subject line' }).fill('Unsaved subject');
    await open();
    await select();
    await expect
      .element(canvas().getByRole('group', { name: 'Historical email subject' }))
      .toHaveTextContent('Original subject');
    const preview = canvas().getByRole('region', { name: 'Historical email text preview' });
    await expect
      .element(preview)
      .toHaveTextContent('Welcome back. Here is <b>literal text</b> from the original email.');
    expect(preview.element().querySelector('b')).toBeNull();
    await close();
    await expect
      .element(page.getByRole('textbox', { name: 'Subject line' }))
      .toHaveValue('Unsaved subject');
  });
});
