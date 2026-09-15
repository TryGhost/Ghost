import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { fakeAdminEndpoint, renderAdminApp } from '@test-utils/acceptance';
import { settleRequests } from '@test-utils/acceptance/worker';
import type { AutomationDetail } from '@tryghost/admin-x-framework/api/automations';
import {
  flags,
  history,
  detail,
  setup,
  respond,
  canvas,
  select,
  open,
  close,
} from './run-history.test-utils';

describe('Historical email cards', () => {
  const lexical = (...paragraphs: string[]) =>
    JSON.stringify({
      root: {
        type: 'root',
        children: paragraphs.map((text) => ({
          type: 'paragraph',
          children: [{ type: 'extended-text', text }],
        })),
      },
    });
  const emailHistory = (subject: string | null, content: string | null) => {
    const data = history('a');
    data.steps[0].action = {
      id: 'draft-email',
      type: 'send_email',
      data: { email_subject: subject, email_lexical: content },
    };
    return data;
  };
  const email = (name = 'Sent email') => canvas().getByRole('article', { name, exact: true });
  const subject = () => email().getByRole('group', { name: 'Historical email subject' });

  it.each([null, '2026-09-14T12:00:05.000Z'])(
    'uses recorded send/delivery evidence %s for the email title and time',
    async (deliveredAt) => {
      setup();
      const data = emailHistory('Welcome', lexical('Thanks for joining.'));
      data.steps[0].email_sent_at = '2026-09-14T12:00:02.000Z';
      data.steps[0].email_delivered_at = deliveredAt;
      respond(data);
      await renderAdminApp('/automations/first', flags);
      await open();
      await select();
      const card = email(deliveredAt ? 'Received email' : 'Sent email');
      await expect.element(card).toBeVisible();
      const time = card.element().querySelector('time')!;
      expect(time.dateTime).toBe(deliveredAt || data.steps[0].email_sent_at);
      expect(time.title).toContain('Sent:');
      if (deliveredAt) {
        expect(time.title).toContain('Delivered:');
      }
      await expect.element(canvas()).not.toHaveTextContent('End time unavailable');
      await expect.element(canvas()).not.toHaveTextContent('Email step completed');
    },
  );
  const preview = () => email().getByRole('region', { name: 'Historical email text preview' });

  it('refreshes a pending email through sent and delivered completion', async () => {
    setup();
    const data = emailHistory('Welcome', lexical('Hello'));
    data.status = 'in_progress';
    data.steps[0].status = 'pending';
    data.steps[0].finished_at = null;
    respond(data);
    await renderAdminApp('/automations/first', flags);
    await open();
    await select();
    await expect.element(email('Send email')).toBeVisible();
    data.steps[0].email_sent_at = '2026-09-14T12:00:02.000Z';
    respond(data);
    await canvas().getByRole('button', { name: 'Refresh run history' }).click();
    await expect.element(email()).toHaveTextContent('Pending');
    data.status = 'completed';
    data.steps[0].status = 'finished';
    data.steps[0].finished_at = '2026-09-14T12:00:03.000Z';
    data.steps[0].email_delivered_at = '2026-09-14T12:00:06.000Z';
    respond(data);
    await canvas().getByRole('button', { name: 'Refresh run history' }).click();
    await expect.element(email('Received email')).toBeVisible();
    await expect
      .element(canvas().getByRole('article', { name: 'Completed', exact: true }))
      .toBeVisible();
  });

  it('shows a successful send alongside a later execution failure', async () => {
    setup();
    const data = emailHistory('Welcome', lexical('Hello'));
    data.status = 'exited_early';
    data.failed = true;
    data.steps[0] = {
      ...data.steps[0],
      status: 'failed',
      email_sent_at: '2026-09-14T12:00:02.000Z',
      finished_at: '2026-09-14T12:00:06.000Z',
    };
    respond(data);
    await renderAdminApp('/automations/first', flags);
    await open();
    await select();
    await expect.element(email()).toHaveTextContent('Failed');
    await expect.element(email()).toHaveTextContent('Stopped');
    expect(
      Array.from(email().element().querySelectorAll('time')).map((time) => time.dateTime),
    ).toEqual(['2026-09-14T12:00:02.000Z', '2026-09-14T12:00:06.000Z']);
    await expect.element(email()).not.toHaveTextContent('Completed');
  });

  it('shows the stored revision subject and excerpt instead of the current or unsaved email', async () => {
    setup();
    const current: AutomationDetail = {
      ...detail('first'),
      actions: [
        {
          id: 'draft-email',
          type: 'send_email',
          data: {
            email_subject: 'Current subject',
            email_lexical: lexical('Current body'),
            email_design_setting_id: 'design',
          },
        },
      ],
    };
    fakeAdminEndpoint('GET', '/automations/first/', { automations: [current] });
    const save = fakeAdminEndpoint('PUT', '/automations/first/', { automations: [current] });
    respond(
      emailHistory(
        'Welcome to the club',
        lexical(
          'Hey there,',
          'Thanks for joining — here’s what to expect next, straight to your inbox.',
          'Over the next few weeks we’ll share our best tips and stories.',
        ),
      ),
    );
    await renderAdminApp('/automations/first', flags);
    await page.getByRole('button', { name: 'Send email: Current subject' }).click();
    await page.getByPlaceholder('Subject line').fill('Unsaved subject');
    await open();
    await select();
    await expect.element(subject()).toHaveTextContent('Welcome to the club');
    await expect.element(preview()).toHaveTextContent('Hey there,');
    await expect.element(preview()).toHaveTextContent('Thanks for joining');
    await expect.element(canvas()).not.toHaveTextContent('Current body');
    await expect.element(canvas()).not.toHaveTextContent('Unsaved subject');
    await expect(email().getByRole('button')).toHaveCount(0);
    await expect(email().getByRole('textbox')).toHaveCount(0);
    await expect.element(email()).not.toHaveTextContent('Received');
    await expect.element(email()).not.toHaveTextContent('Delivered');
    await close();
    await expect.element(page.getByPlaceholder('Subject line')).toHaveValue('Unsaved subject');
    expect(save.requests).toHaveLength(0);
  });

  it('shows a pending email with its scheduled time, including when an attempt has started', async () => {
    setup();
    const data = emailHistory('Upcoming message', lexical('Upcoming body'));
    data.status = 'in_progress';
    data.steps[0] = {
      ...data.steps[0],
      status: 'pending',
      finished_at: null,
      ready_at: '2026-09-20T12:00:00.000Z',
    };
    respond(data);
    await renderAdminApp('/automations/first', flags);
    await open();
    await select();
    await expect.element(email('Send email')).toHaveTextContent('Upcoming message');
    await expect.element(email('Send email')).toHaveTextContent('Pending');
    await expect.element(email('Send email')).toHaveTextContent('Scheduled');
    expect(email('Send email').element().querySelector('time')?.dateTime).toBe(
      data.steps[0].ready_at,
    );
    await expect.element(email('Send email')).not.toHaveTextContent('Sending');
    await expect.element(email('Send email')).not.toHaveTextContent('Sent');
  });

  it('retains historical content on an exited email without claiming it was sent', async () => {
    setup();
    const data = emailHistory('Unsent subject', lexical('Unsent body'));
    data.status = 'exited_early';
    data.steps[0].status = 'member unsubscribed';
    respond(data);
    await renderAdminApp('/automations/first', flags);
    await open();
    await select();
    await expect.element(email('Send email')).toHaveTextContent('Unsent body');
    await expect.element(email('Send email')).toHaveTextContent('Member unsubscribed');
    await expect.element(email('Send email')).not.toHaveTextContent('Sent email');
  });

  it.each([
    [null, null, 'Subject unavailable', 'Historical email content is unavailable.'],
    ['', '', 'No subject', 'Email content is empty.'],
    ['Saved subject', '{malformed', 'Saved subject', 'Historical email content is unavailable.'],
    [
      'Media only',
      JSON.stringify({ root: { children: [{ type: 'image', src: '/not-loaded.jpg' }] } }),
      'Media only',
      'No text preview is available for this content.',
    ],
  ])(
    'handles subject %s and content %s explicitly',
    async (subjectText, content, expectedSubject, expectedContent) => {
      setup();
      respond(emailHistory(subjectText, content));
      await renderAdminApp('/automations/first', flags);
      await open();
      await select();
      await expect.element(subject()).toHaveTextContent(expectedSubject);
      await expect.element(preview()).toHaveTextContent(expectedContent);
    },
  );

  it('renders HTML and links as inert text, without loading embedded resources', async () => {
    setup();
    const resource = fakeAdminEndpoint('GET', '/history-preview-resource/', {});
    const content = JSON.stringify({
      root: {
        type: 'root',
        children: [
          {
            type: 'html',
            html: '<p>Historical <strong>message</strong></p><a href="javascript:alert(1)">Read more</a><img src="/ghost/api/admin/history-preview-resource/" onerror="document.body.dataset.historyExecuted = true"><script>document.body.dataset.historyExecuted = true</script>',
          },
        ],
      },
    });
    respond(emailHistory('<b>Literal subject</b>', content));
    await renderAdminApp('/automations/first', flags);
    await open();
    await select();
    await expect.element(subject()).toHaveTextContent('<b>Literal subject</b>');
    await expect.element(preview()).toHaveTextContent('Historical message');
    await expect.element(preview()).toHaveTextContent('Read more');
    await settleRequests();
    expect(preview().element().querySelector('img, iframe, a, script')).toBeNull();
    expect(resource.requests).toHaveLength(0);
    expect(document.body.dataset.historyExecuted).toBeUndefined();
  });

  it('keeps long subjects and text excerpts within the email card', async () => {
    setup();
    const longSubject = 'A historical subject that is much longer than the available space '.repeat(
      4,
    );
    respond(
      emailHistory(
        longSubject,
        lexical(
          ...Array.from(
            { length: 10 },
            () => 'A paragraph from the original email, preserved as a text excerpt.',
          ),
        ),
      ),
    );
    await renderAdminApp('/automations/first', flags);
    await open();
    await select();
    await expect.element(subject()).toHaveTextContent(longSubject.trim());
    const subjectText = subject().element().querySelector('[title]')!;
    expect(subjectText.getAttribute('title')).toBe(longSubject.trim());
    expect(subjectText.scrollWidth).toBeGreaterThan(subjectText.clientWidth);
    const body = preview().element();
    expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth);
    expect(body.getBoundingClientRect().height).toBeLessThan(250);
  });
});
