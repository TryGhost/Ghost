import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import {
  currentRoute,
  currentUserResponse,
  fakeAdminEndpoint,
  fakePosts,
  post,
  renderAdminApp,
  staffRole,
} from '@test-utils/acceptance';

const POST_ID = '609a7f43e0c07e0022c5d78b';
const EMAIL_ID = '609a7f43e0c07e0022c5d78c';
const route = `/posts/analytics/${POST_ID}/debug`;
const email = {
  id: EMAIL_ID,
  status: 'failed' as const,
  error: 'Provider rejected the email',
  email_count: 1234,
  opened_count: 42,
  delivered_count: 1200,
  failed_count: 34,
  created_at: '2026-09-01T10:00:00.000Z',
  submitted_at: '2026-09-01T10:01:00.000Z',
  recipient_filter: 'status:paid',
  track_opens: true,
  track_clicks: false,
  feedback_enabled: true,
};
const job = {
  running: true,
  lastStarted: '2026-09-10T10:00:00.000Z',
  lastBegin: '2026-09-10T09:00:00.000Z',
  lastEventTimestamp: '2026-09-10T09:30:00.123Z',
  fetchedThrough: '2026-09-10T09:59:00.456Z',
  lagSeconds: 90061,
};

function seed() {
  const posts = fakePosts([
    post({ id: POST_ID, title: 'Newsletter diagnostics', status: 'published', email }),
  ]);
  const emails = fakeAdminEndpoint('GET', `/emails/${EMAIL_ID}/`, { emails: [email] });
  const batches = fakeAdminEndpoint('GET', new RegExp(`^/emails/${EMAIL_ID}/batches/`), {
    batches: [
      {
        id: 'batch-1',
        status: 'failed',
        created_at: email.created_at,
        member_segment: 'status:paid',
        count: { recipients: 1234 },
        mailgun_message_id: 'provider-id',
        error_status_code: 500,
        error_message: 'Provider unavailable',
      },
      { id: 'batch-2', status: 'submitted', count: { recipients: 12 } },
    ],
  });
  const failures = fakeAdminEndpoint(
    'GET',
    new RegExp(`^/emails/${EMAIL_ID}/recipient-failures/`),
    {
      failures: [
        {
          id: 'failure-1',
          severity: 'permanent',
          code: 550,
          enhanced_code: '5.1.1',
          message: 'Mailbox does not exist',
          email_recipient: { member_name: 'Ada', member_email: 'ada@example.com' },
          member: { id: 'member-1', name: 'Ada' },
        },
        {
          id: 'failure-2',
          severity: 'temporary',
          code: 451,
          message: 'Try again later',
          email_recipient: { member_name: 'Deleted member', member_email: 'deleted@example.com' },
          member: null,
        },
      ],
    },
  );
  const analytics = fakeAdminEndpoint('GET', `/emails/${EMAIL_ID}/analytics/`, {
    latest: job,
    latestOpened: {},
    missing: {},
    scheduled: {},
  });
  return { posts, emails, batches, failures, analytics };
}

const overview = () => page.getByRole('tab', { name: 'Overview', exact: true });

describe('Post debug', () => {
  it('renders failures and full batch details at the existing URL', async () => {
    const api = seed();
    await renderAdminApp(route);
    await expect
      .element(page.getByRole('heading', { name: 'Newsletter diagnostics' }))
      .toBeVisible();
    await expect
      .element(page.getByRole('link', { name: /Ada ada@example.com/ }))
      .toHaveAttribute('href', '#/members/member-1');
    await expect.element(page.getByText('Mailbox does not exist')).toBeVisible();
    await expect.element(page.getByText('Enhanced code: 5.1.1')).toBeVisible();
    await page.getByRole('button', { name: 'Show full error' }).click();
    await expect
      .element(page.getByRole('button', { name: 'Show less' }))
      .toHaveAttribute('aria-expanded', 'true');
    await expect
      .element(page.getByRole('link', { name: 'Retry' }))
      .toHaveAttribute('href', `#/editor/post/${POST_ID}`);
    await page.getByRole('tab', { name: '1 Temporary failure', exact: true }).click();
    await expect.element(page.getByText('deleted@example.com')).toBeVisible();
    await expect
      .element(page.getByRole('link', { name: /Deleted member/ }))
      .not.toBeInTheDocument();
    await page.getByRole('tab', { name: '1 batch errored', exact: true }).click();
    await expect.element(page.getByText('Provider id: provider-id')).toBeVisible();
    await expect.element(page.getByText('1,234', { exact: true }).first()).toBeVisible();
    expect(new URL(api.batches.lastRequest!.url).searchParams.get('include')).toBe(
      'count.recipients',
    );
    expect(new URL(api.batches.lastRequest!.url).searchParams.get('order')).toBe(
      'status asc, created_at desc',
    );
    expect(new URL(api.failures.lastRequest!.url).searchParams.get('include')).toBe(
      'member,email_recipient',
    );
    await expect(api.posts).toHaveSentFilter(`id:${POST_ID}`);
  });

  it('renders UTC diagnostics and schedules default and custom refetches', async () => {
    seed();
    const schedule = fakeAdminEndpoint('PUT', new RegExp(`^/emails/${EMAIL_ID}/analytics/`), {});
    await renderAdminApp(route);
    await overview().click();
    await expect.element(page.getByText('1d 1h 1m 1s')).toBeVisible();
    await expect.element(page.getByText('10 Sep, 2026, 09:59:00.456 UTC')).toBeVisible();
    await page.getByRole('button', { name: 'Refetch Analytics', exact: true }).click();
    await expect.poll(() => schedule.requests.length).toBe(1);
    expect(new URL(schedule.lastRequest!.url).search).toBe('');
    await page.getByRole('button', { name: 'Custom Date Range' }).click();
    await expect.element(page.getByLabelText('Begin (UTC)')).toHaveValue('2026-09-01T10:00');
    await page.getByLabelText('Begin (UTC)').fill('2026-09-02T12:30');
    await page.getByLabelText('End (UTC)').fill('2026-09-03T13:45');
    await page.getByRole('button', { name: 'Schedule Custom Refetch' }).click();
    await expect.poll(() => schedule.requests.length).toBe(2);
    const params = new URL(schedule.lastRequest!.url).searchParams;
    expect(params.get('begin')).toBe('2026-09-02T12:30:00.000Z');
    expect(params.get('end')).toBe('2026-09-03T13:45:00.000Z');
    await expect.element(page.getByLabelText('Begin (UTC)')).not.toBeInTheDocument();
  });

  it('cancels the global scheduled refetch and refreshes its status', async () => {
    seed();
    let canceled = false;
    fakeAdminEndpoint('GET', `/emails/${EMAIL_ID}/analytics/`, () => ({
      scheduled: {
        running: true,
        canceled,
        schedule: { begin: email.created_at, end: email.submitted_at },
      },
    }));
    const cancel = fakeAdminEndpoint('DELETE', '/emails/analytics/', () => {
      canceled = true;
      return {};
    });
    await renderAdminApp(route);
    await overview().click();
    await page.getByRole('button', { name: 'Cancel scheduled refetch' }).click();
    await expect.poll(() => cancel.requests.length).toBe(1);
    await expect
      .element(page.getByRole('button', { name: 'Cancel scheduled refetch' }))
      .not.toBeInTheDocument();
  });

  it('keeps custom dates and shows a scheduling failure', async () => {
    seed();
    fakeAdminEndpoint(
      'PUT',
      new RegExp(`^/emails/${EMAIL_ID}/analytics/`),
      { errors: [{ message: 'Refetch unavailable' }] },
      { status: 500 },
    );
    await renderAdminApp(route);
    await overview().click();
    await page.getByRole('button', { name: 'Custom Date Range' }).click();
    await page.getByRole('button', { name: 'Schedule Custom Refetch' }).click();
    await expect.element(page.getByText('Refetch unavailable')).toBeVisible();
    await expect.element(page.getByLabelText('Begin (UTC)')).toBeVisible();
  });

  it('supports older analytics responses without ingestion lag fields', async () => {
    seed();
    fakeAdminEndpoint('GET', `/emails/${EMAIL_ID}/analytics/`, {
      latest: { running: false, lastStarted: job.lastStarted },
      missing: {},
      latestOpened: {},
      scheduled: {},
    });
    await renderAdminApp(route);
    await overview().click();
    await expect
      .element(page.getByText('Analytics Delivery/failures', { exact: true }))
      .toBeVisible();
    await expect
      .element(page.getByRole('row').filter({ hasText: 'Ingestion lag' }).first())
      .toHaveTextContent('N/A');
    await expect
      .element(page.getByRole('button', { name: 'Refetch Analytics', exact: true }))
      .toBeVisible();
  });

  it('refreshes analytics and email status and stops polling on unmount', async () => {
    const api = seed();
    const app = await renderAdminApp(route);
    await overview().click();
    await expect.poll(() => api.emails.requests.length).toBeGreaterThan(0);
    const emailRequests = api.emails.requests.length;
    const analyticsRequests = api.analytics.requests.length;
    fakeAdminEndpoint('GET', `/emails/${EMAIL_ID}/`, {
      emails: [{ ...email, status: 'submitted', error: null }],
    });
    await expect
      .poll(() => api.analytics.requests.length, { timeout: 7000 })
      .toBeGreaterThan(analyticsRequests);
    await expect
      .poll(() => page.getByRole('link', { name: 'Retry' }).query(), { timeout: 12000 })
      .toBeNull();
    expect(emailRequests).toBeGreaterThan(0);
    await app.unmount();
    const stopped = api.analytics.requests.length;
    await new Promise((resolve) => {
      setTimeout(resolve, 5500);
    });
    expect(api.analytics.requests.length).toBe(stopped);
  }, 25000);

  it('does not request email diagnostics for a post without an email', async () => {
    fakePosts([post({ id: POST_ID, title: 'Web only', email: null })]);
    await renderAdminApp(route);
    await expect.element(page.getByText('No email data for this post.')).toBeVisible();
  });

  it.each(['Author', 'Contributor'] as const)(
    'redirects a %s who does not own the post',
    async (role) => {
      const me = currentUserResponse();
      me.users[0].roles = [staffRole({ name: role })];
      fakePosts([post({ id: POST_ID, authors: [{ id: 'someone-else' }], email })]);
      await renderAdminApp(route, { boot: { browseMe: { response: me } } });
      await expect.poll(currentRoute).toBe('/posts');
      // Any diagnostic request would be unhandled and fail this test.
    },
  );

  it('redirects a contributor from their published post', async () => {
    const me = currentUserResponse();
    me.users[0].roles = [staffRole({ name: 'Contributor' })];
    fakePosts([
      post({ id: POST_ID, status: 'published', authors: [{ id: me.users[0].id }], email }),
    ]);
    await renderAdminApp(route, { boot: { browseMe: { response: me } } });
    await expect.poll(currentRoute).toBe('/posts');
  });
});
