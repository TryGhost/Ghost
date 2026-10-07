import { describe, expect, it } from 'vitest';
import { renderAdminApp } from '@test-utils/acceptance';
import { flags, history, setup, respond, canvas, select, open } from './run-history.test-utils';

describe('Recorded email history', () => {
  it('shows the saved subject and delivery separately from a later step failure', async () => {
    setup();
    const data = history('a');
    data.status = 'exited_early';
    data.failed = true;
    data.steps[0] = {
      ...data.steps[0],
      status: 'failed',
      email_sent_at: '2026-09-14T12:00:01.000Z',
      email_delivered_at: '2026-09-14T12:00:02.000Z',
      finished_at: '2026-09-14T12:00:03.000Z',
      action: {
        id: 'old-email',
        type: 'send_email',
        data: {
          email_subject: 'The original welcome',
          email_lexical: '',
        },
      },
    };
    respond(data);
    await renderAdminApp('/automations/first', flags);
    await open();
    await select();
    const email = canvas().getByRole('article', { name: 'Received email', exact: true });
    await expect.element(email).toHaveTextContent('The original welcome');
    expect(email.element().querySelector('time')?.dateTime).toBe(data.steps[0].email_delivered_at);
    await expect
      .element(canvas().getByRole('article', { name: 'Email step failed', exact: true }))
      .toBeVisible();
  });
});
