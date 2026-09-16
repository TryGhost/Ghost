import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import {
  currentRoute,
  currentUserResponse,
  fakeAdminEndpoint,
  fakeMembers,
  fakeNewsletters,
  fakeTiers,
  member,
  newsletter,
  renderAdminApp,
  settingsResponse,
  staffRole,
  tier,
  type Member,
} from '@test-utils/acceptance';
import type { StaffRoleName } from '@tryghost/test-data';
import type { MemberActivityEvent } from '@tryghost/admin-x-framework/api/members';
import { activityScreen as screen } from './member-activity.screen';

const EVENTS = /^\/members\/events\//;
const labs = { membersActivityReact: true };
const permittedRoles: StaffRoleName[] = ['Owner', 'Administrator', 'Super Editor'];
const ada = member({ id: 'ada', name: 'Ada Lovelace', email: 'ada@example.com' });
const grace = member({ id: 'grace', name: 'Grace Hopper', email: 'grace@example.com' });

function event(
  id: string,
  type = 'signup_event',
  person: Member | null = ada,
): MemberActivityEvent {
  return {
    type,
    data: {
      id,
      member: person ? { ...person, avatar_image: person.avatar_image ?? null } : null,
      member_id: person?.id,
      created_at: '2026-09-01T12:00:00.000Z',
    },
  };
}

function world(events: MemberActivityEvent[] = [event('signup')]) {
  const membersApi = fakeMembers([ada, grace]);
  fakeAdminEndpoint('GET', '/members/ada/', { members: [ada] });
  fakeAdminEndpoint('GET', '/members/grace/', { members: [grace] });
  const eventsApi = fakeAdminEndpoint('GET', EVENTS, { events });
  return { eventsApi, membersApi };
}

function firstActivityPage() {
  return Array.from({ length: 50 }, (_, index) => ({
    ...event(`event-${index}`),
    data: {
      ...event(`event-${index}`).data,
      created_at: new Date(Date.UTC(2026, 8, 1, 12, 0, 50 - index)).toISOString(),
    },
  }));
}

describe('Member activity', () => {
  afterEach(async () => {
    await page.viewport(1280, 800);
  });
  it('opens a member from the global table, retains exclusions, and follows browser history', async () => {
    world();
    await renderAdminApp('/members-activity?excludedEvents=login_event', { labs });

    await expect.element(screen.heading('Member activity')).toBeVisible();
    await expect.element(screen.memberColumn()).toBeVisible();
    await expect.element(screen.text('Signed up')).toBeVisible();
    await screen.link(/Ada Lovelace/).click();

    await expect.element(screen.heading('Ada Lovelace')).toBeVisible();
    await expect.element(screen.memberColumn()).not.toBeInTheDocument();
    await expect.poll(currentRoute).toBe('/members-activity?excludedEvents=login_event&member=ada');
    await expect
      .element(screen.link('View member profile →'))
      .toHaveAttribute('href', '#/members/ada');

    window.history.back();
    await expect.element(screen.heading('Member activity')).toBeVisible();
    await expect.element(screen.memberColumn()).toBeVisible();
    window.history.forward();
    await expect.element(screen.heading('Ada Lovelace')).toBeVisible();
    await screen.link('Member activity').click();
    await expect.element(screen.heading('Member activity')).toBeVisible();
    await expect.poll(currentRoute).toBe('/members-activity');
  });

  it('searches the real members endpoint with a debounce and selects a member', async () => {
    world();
    const membersApi = fakeMembers(({ search }) => (search === 'Grace' ? [grace] : []));
    await renderAdminApp('/members-activity', { labs });
    await expect.element(screen.search()).toBeVisible();
    await expect.element(page.getByRole('listbox')).not.toBeInTheDocument();
    await screen.search().fill('Grace');
    await expect(membersApi).toHaveSentSearch('Grace');
    await expect.poll(() => membersApi.lastRequest?.limit).toBe(20);
    await expect.element(screen.memberOption(/Grace Hopper/)).toBeVisible();
    await expect.element(screen.memberOption(/Ada Lovelace/)).not.toBeInTheDocument();
    await userEvent.keyboard('{Enter}');
    await expect.element(screen.heading('Grace Hopper')).toBeVisible();
    await expect.poll(currentRoute).toBe('/members-activity?member=grace');
  });

  it('groups gift purchases and donations under Payments and resets all filters', async () => {
    world();
    fakeAdminEndpoint('GET', EVENTS, ({ url }) => ({
      events: new URL(url).searchParams.get('filter')?.includes('payment_event')
        ? []
        : [event('signup')],
    }));
    await renderAdminApp('/members-activity?member=ada', { labs });
    await expect.element(screen.text('Signed up')).toBeVisible();
    await expect.element(screen.filterButton()).toHaveTextContent('All events');
    await screen.filterButton().click();
    await expect.element(screen.eventType('Email opened')).toBeVisible();
    const eventNames = () =>
      page
        .getByRole('menuitemcheckbox')
        .elements()
        .map((item) => item.textContent);
    const originalOrder = eventNames();
    await screen.eventType('Payments').click();
    await expect.element(screen.eventType('Payments')).toHaveAttribute('aria-checked', 'false');
    expect(eventNames()).toEqual(originalOrder);
    await userEvent.keyboard('{Escape}');
    await expect
      .element(screen.filterButton())
      .toHaveTextContent(`${originalOrder.length - 1} events`);
    await expect.element(screen.heading('No activities match the current filter')).toBeVisible();
    await expect
      .poll(currentRoute)
      .toBe(
        '/members-activity?member=ada&excludedEvents=payment_event%2Cdonation_event%2Cgift_purchase_event',
      );
    await screen.showAll().click();
    await expect.element(screen.heading('Member activity')).toBeVisible();
    await expect.poll(currentRoute).toBe('/members-activity');
  });

  it('omits global email filters and respects disabled newsletters, comments and click tracking', async () => {
    const { eventsApi } = world([]);
    await renderAdminApp('/members-activity', {
      labs,
      boot: {
        browseSettings: {
          response: settingsResponse({
            settings: {
              editor_default_email_recipients: 'disabled',
              comments_enabled: 'off',
              email_track_clicks: false,
            },
          }),
        },
      },
    });
    await expect.element(screen.heading('No member activity yet')).toBeVisible();
    await screen.filterButton().click();
    await expect.element(screen.eventType('Email opened')).not.toBeInTheDocument();
    await expect.element(screen.eventType('Email subscriptions')).not.toBeInTheDocument();
    await expect.element(screen.eventType('Comments')).not.toBeInTheDocument();
    await expect.element(screen.eventType('Clicked link in email')).not.toBeInTheDocument();
    await expect.element(screen.eventType('Welcome email received')).toBeVisible();
    await expect
      .poll(() => new URL(eventsApi.lastRequest!.url).searchParams.get('filter'))
      .toContain('comment_event');
  });

  it('renders absent members and unknown event types without unsafe links', async () => {
    const unknown = event('future', 'future_event', null);
    const signup = event('unsafe');
    signup.data.attribution = { title: 'Unsafe source', url: 'javascript:alert(1)' };
    world([unknown, signup]);
    await renderAdminApp('/members-activity', { labs });
    await expect.element(screen.text('Unknown activity')).toBeVisible();
    await expect.element(screen.text('Unknown member')).toBeVisible();
    await expect.element(screen.link('Unknown member')).not.toBeInTheDocument();
    await expect.element(screen.link('Unsafe source')).not.toBeInTheDocument();
    await expect(screen.rows()).toHaveCount(2);
  });

  it('shows subscription revenue, one-time payment amounts, and newsletter names', async () => {
    const subscription = event('paid', 'subscription_event');
    Object.assign(subscription.data, {
      type: 'created',
      mrr_delta: 500,
      currency: 'usd',
      tierName: 'Gold',
    });
    const donation = event('donation', 'donation_event');
    Object.assign(donation.data, { amount: 1000, currency: 'usd' });
    const subscribed = event('newsletter', 'newsletter_event');
    Object.assign(subscribed.data, { subscribed: true, newsletter: { name: 'Weekly' } });
    world([subscription, donation, subscribed]);
    fakeTiers([tier({ name: 'Gold' }), tier({ name: 'Silver' })]);
    fakeNewsletters([newsletter({ name: 'Daily' }), newsletter({ name: 'Weekly' })]);
    await renderAdminApp('/members-activity', { labs });
    await expect.element(screen.text('(Gold $5/month)')).toBeVisible();
    await expect.element(screen.text('($10)')).toBeVisible();
    await expect.element(screen.text('Subscribed to Weekly')).toBeVisible();
  });

  it('shows a missing member state with a way back to global activity', async () => {
    world();
    fakeAdminEndpoint(
      'GET',
      '/members/missing/',
      { errors: [{ type: 'NotFoundError', message: 'Member not found' }] },
      { status: 404 },
    );
    await renderAdminApp('/members-activity?member=missing', { labs });
    await expect.element(screen.heading('Member not found')).toBeVisible();
    await screen.clearMember().click();
    await expect.element(screen.heading('Member activity')).toBeVisible();
    await expect.element(screen.text('Signed up')).toBeVisible();
  });

  it('clears old rows while a changed filter is loading', async () => {
    world();
    let release: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    fakeAdminEndpoint('GET', EVENTS, async ({ url }) => {
      if (new URL(url).searchParams.get('filter')?.includes('signup_event')) {
        await pending;
        return { events: [] };
      }
      return { events: [event('signup')] };
    });
    await renderAdminApp('/members-activity', { labs });
    await expect.element(screen.text('Signed up')).toBeVisible();
    await screen.filterButton().click();
    await screen.eventType('Signups').click();
    await userEvent.keyboard('{Escape}');
    await expect.element(screen.text('Signed up')).not.toBeInTheDocument();
    await expect
      .element(page.getByRole('status', { name: 'Loading member activity' }))
      .toBeVisible();
    release?.();
    await expect.element(screen.heading('No activities match the current filter')).toBeVisible();
  });

  it('shows a request error and retries without losing the member filter', async () => {
    world();
    fakeAdminEndpoint(
      'GET',
      EVENTS,
      { errors: [{ type: 'ValidationError', message: 'Could not load activity' }] },
      { status: 422 },
    );
    await renderAdminApp('/members-activity?member=ada', { labs });
    await expect.element(screen.heading('Couldn’t load member activity')).toBeVisible();
    const retryApi = fakeAdminEndpoint('GET', EVENTS, { events: [event('retry')] });
    await screen.retry().click();
    await expect.element(screen.text('Signed up')).toBeVisible();
    await expect
      .poll(() => new URL(retryApi.lastRequest!.url).searchParams.get('filter'))
      .toContain("data.member_id:'ada'");
  });

  it('loads the next page when the list reaches the end', async () => {
    const firstPage = firstActivityPage();
    world();
    const api = fakeAdminEndpoint('GET', EVENTS, ({ url }) => {
      const filter = new URL(url).searchParams.get('filter') ?? '';
      if (filter.includes('data.created_at:<')) {
        return { events: [event('last', 'login_event', grace)] };
      }
      if (filter.includes('data.created_at:')) {
        return { events: [] };
      }
      return { events: firstPage };
    });
    await renderAdminApp('/members-activity', { labs });
    await expect(screen.rows()).toHaveCount(50);
    screen.scrollToEnd();
    await expect.element(screen.text('Logged in')).toBeVisible();
    await expect(screen.rows()).toHaveCount(51);
    expect(
      api.requests.some((request) =>
        new URL(request.url).searchParams.get('filter')?.includes('data.created_at:<'),
      ),
    ).toBe(true);
  });

  it('keeps loaded rows when loading more fails and retries from the same position', async () => {
    world(firstActivityPage());
    await renderAdminApp('/members-activity', { labs });
    await expect(screen.rows()).toHaveCount(50);
    fakeAdminEndpoint(
      'GET',
      EVENTS,
      { errors: [{ type: 'ValidationError', message: 'Could not load more' }] },
      { status: 422 },
    );
    screen.scrollToEnd();
    await expect.element(screen.heading('Couldn’t load more activity')).toBeVisible();
    await expect.element(page.getByRole('alert')).toHaveTextContent('Couldn’t load more activity');
    await expect(screen.rows()).toHaveCount(50);
    fakeAdminEndpoint('GET', EVENTS, ({ url }) => ({
      events: new URL(url).searchParams.get('filter')?.includes('data.created_at:<')
        ? [event('last', 'login_event', grace)]
        : [],
    }));
    await screen.retry().click();
    await expect.element(screen.text('Logged in')).toBeVisible();
    await expect(screen.rows()).toHaveCount(51);
  });

  it('reports settings failure instead of claiming there is no activity', async () => {
    const { eventsApi } = world();
    await renderAdminApp('/members-activity', {
      labs,
      boot: {
        browseSettings: {
          response: { errors: [{ type: 'ValidationError', message: 'Could not load settings' }] },
          responseStatus: 422,
        },
      },
    });
    await expect.element(screen.heading('Couldn’t load activity settings')).toBeVisible();
    await expect.element(screen.heading('No member activity yet')).not.toBeInTheDocument();
    expect(eventsApi.requests).toHaveLength(0);
    fakeAdminEndpoint('GET', /^\/settings\/\?group=/, settingsResponse({ labs }));
    await screen.retry().click();
    await expect.element(screen.text('Signed up')).toBeVisible();
  });

  it.each(permittedRoles)('allows %s to browse activity', async (role) => {
    world();
    const me = currentUserResponse();
    me.users[0].roles = [staffRole({ name: role })];
    await renderAdminApp('/members-activity', { labs, boot: { browseMe: { response: me } } });
    await expect.element(screen.text('Signed up')).toBeVisible();
  });

  it('opens the stored email preview and fits the mobile device at desktop and narrow widths', async () => {
    const opened = event('open', 'email_opened_event');
    opened.data.email = {
      subject: 'Original newsletter',
      html: '<!doctype html><html><head></head><body>Original email body</body></html>',
    };
    world([opened]);
    fakeNewsletters([newsletter({ name: 'Daily', sender_name: 'Daily sender' })]);
    await page.viewport(1280, 720);
    await renderAdminApp('/members-activity?member=ada', { labs });
    await screen.previewButton('Original newsletter').click();
    await expect.element(screen.preview()).toBeVisible();
    await expect
      .element(screen.preview().getByText('Daily sender', { exact: false }))
      .toBeVisible();
    await page.getByRole('radio', { name: 'Mobile', exact: true }).click();
    await expect
      .element(screen.preview().getByText('Original newsletter', { exact: true }))
      .toBeVisible();
    await page.viewport(375, 720);
    await expect
      .poll(() => screen.preview().element().scrollWidth - screen.preview().element().clientWidth)
      .toBe(0);
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await expect.element(screen.preview()).not.toBeInTheDocument();
  });

  it('keeps the global filters reachable on a narrow screen', async () => {
    world();
    await page.viewport(375, 720);
    await renderAdminApp('/members-activity', { labs });
    await expect.element(screen.text('Signed up')).toBeVisible();
    await expect
      .poll(() => screen.root().element().scrollWidth - screen.root().element().clientWidth)
      .toBe(0);
    await screen.filterButton().click();
    await expect.element(screen.eventType('Signups')).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect.element(screen.search()).toBeVisible();
  });
});
