import { beforeEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { fakeAdminEndpoint, fakeLabels, fakeTiers } from '@test-utils/acceptance';
import { TestWrapper } from '@test-utils/fixtures/query-client';
import '@/index.css';

import { PublishFlowModal } from '@/editor/publish/publish-flow-modal';
import { UpdateFlowModal } from '@/editor/publish/update-flow-modal';
import { publishScreen } from '@/editor/publish/publish.screen';
import type { PublishFlowPost } from '@/editor/publish/flow-post';
import type {
  PublishDispatch,
  PublishSiteInput,
  PublishUserInput,
} from '@/editor/publish/publish-options';
import type { SaveCompletion, SaveErrorKind } from '@/editor/engine/save-engine';

const POST_ID = 'post-1';
const EMAIL_ID = 'email-1';
const EVERYONE = 'status:free,status:-free';
// The email poller waits a second between reads, so these journeys outlast the default timeout.
const SLOW = 25_000;

const SITE: PublishSiteInput = {
  membersEnabled: true,
  mailgunConfigured: true,
  editorDefaultEmailRecipients: 'visibility',
  editorDefaultEmailRecipientsFilter: null,
  memberCount: 20,
  newsletters: [
    { slug: 'weekly', name: 'Weekly', status: 'active', visibility: 'members', sortOrder: 0 },
  ],
};

const USER: PublishUserInput = { isAdmin: true, isAuthorOrContributor: false };

function draft(overrides: Partial<PublishFlowPost> = {}): PublishFlowPost {
  return {
    id: POST_ID,
    displayName: 'post',
    status: 'draft',
    title: 'Hello from React',
    excerpt: 'A short summary',
    url: 'https://example.com/hello-from-react/',
    visibility: 'public',
    publishedAt: null,
    ...overrides,
  };
}

function saved(status: PublishFlowPost['status'] = 'published'): SaveCompletion {
  return {
    kind: 'saved',
    result: { id: POST_ID, status, updatedAt: '2026-09-02T10:00:00.000Z' },
    executedAs: status === 'scheduled' ? 'schedule' : 'publish',
  };
}

function failed(kind: SaveErrorKind, message: string): SaveCompletion {
  return { kind: 'failed', error: { kind, message }, executedAs: 'publish' };
}

/** Member counts for every recipient probe the flow makes. */
function fakeMemberCounts(total: number) {
  return fakeAdminEndpoint('GET', /^\/members\/\?.*filter=/, {
    members: [],
    meta: { pagination: { page: 1, limit: 1, pages: 1, total, next: null, prev: null } },
  });
}

/** The published-post total the complete step counts up from. */
function fakePublishedCount(total: number) {
  return fakeAdminEndpoint('GET', /^\/posts\/\?/, {
    posts: [],
    meta: { pagination: { page: 1, limit: 1, pages: 1, total, next: null, prev: null } },
  });
}

/** What the email poller reads back after the save. */
function fakeEmailPolling(...states: Array<{ status: string; error?: string | null }>) {
  let index = 0;

  return fakeAdminEndpoint('GET', new RegExp(`^/posts/${POST_ID}/\\?`), () => {
    const email = states[Math.min(index, states.length - 1)];
    index += 1;

    return {
      posts: [
        {
          id: POST_ID,
          status: 'published',
          email: { id: EMAIL_ID, email_count: 20, opened_count: 0, ...email },
        },
      ],
    };
  });
}

function completesWith(completion: SaveCompletion) {
  return vi.fn((command: PublishDispatch): Promise<SaveCompletion> => {
    void command;
    return Promise.resolve(completion);
  });
}

async function renderPublishFlow(
  props: Partial<React.ComponentProps<typeof PublishFlowModal>> = {},
) {
  const dispatch = completesWith(saved());
  const onCompleted = vi.fn();

  const rendered = await render(
    <TestWrapper>
      <PublishFlowModal
        dispatch={dispatch}
        post={draft()}
        site={SITE}
        timezone="Etc/UTC"
        user={USER}
        onClose={() => {}}
        onCompleted={onCompleted}
        {...props}
      />
    </TestWrapper>,
  );

  return { dispatch, onCompleted, unmount: () => rendered.unmount() };
}

describe('Publish flow', () => {
  beforeEach(() => {
    localStorage.clear();
    fakeMemberCounts(20);
    fakePublishedCount(41);
    fakeEmailPolling({ status: 'submitted' });
    fakeTiers([]);
    fakeLabels([]);
  });

  it(
    'publishes and emails a draft, then hands the celebration to the list',
    async () => {
      const { dispatch } = await renderPublishFlow();

      await expect.element(publishScreen.options()).toBeInTheDocument();
      await publishScreen.continueButton().click();

      await expect.element(publishScreen.confirm()).toBeInTheDocument();
      await expect
        .element(publishScreen.confirmButton())
        .toHaveTextContent('Publish & send, right now');

      await publishScreen.confirmButton().click();

      await expect.element(publishScreen.complete()).toBeInTheDocument();
      expect(dispatch).toHaveBeenCalledWith({
        kind: 'publish',
        options: { emailOnly: false, newsletter: 'weekly', emailSegment: EVERYONE },
      });
      expect(JSON.parse(localStorage.getItem('ghost-last-published-post') ?? 'null')).toEqual({
        id: POST_ID,
        type: 'post',
      });
      await expect.element(publishScreen.complete()).toHaveTextContent('Boom. It’s out there.');
      await expect
        .element(publishScreen.complete())
        .toHaveTextContent('That’s 42 posts published, keep going!');
    },
    SLOW,
  );

  it(
    'holds the confirm button through the email poll so the publish cannot be dispatched twice',
    async () => {
      // Two polls, so the flow is still waiting when the assertions run.
      fakeEmailPolling({ status: 'pending' }, { status: 'submitted' });
      const { dispatch } = await renderPublishFlow();

      await publishScreen.continueButton().click();
      await publishScreen.confirmButton().click();

      await expect
        .poll(() => publishScreen.confirmButton().element().textContent, { timeout: 2000 })
        .toContain('Publishing & sending');
      await expect
        .poll(() => publishScreen.confirmButton().element().hasAttribute('disabled'), {
          timeout: 2000,
        })
        .toBe(true);
      expect(dispatch).toHaveBeenCalledTimes(1);

      await expect.element(publishScreen.complete()).toBeInTheDocument();
      expect(dispatch).toHaveBeenCalledTimes(1);
    },
    SLOW,
  );

  it(
    'completes nothing when the flow is torn down mid-poll',
    async () => {
      fakeEmailPolling({ status: 'pending' });
      const { dispatch, onCompleted, unmount } = await renderPublishFlow();

      await publishScreen.continueButton().click();
      await publishScreen.confirmButton().click();
      // The save has landed and the poll is running.
      await expect.poll(() => dispatch.mock.calls.length).toBe(1);

      await unmount();

      // Long enough for two poll ticks to have landed had the run continued.
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 2500);
      });
      expect(onCompleted).not.toHaveBeenCalled();
      expect(localStorage.getItem('ghost-last-published-post')).toBeNull();
    },
    SLOW,
  );

  it('publishes without emailing when the publish-only type is chosen', async () => {
    const { dispatch } = await renderPublishFlow();

    await publishScreen.setting('publish-type').click();
    await page.getByLabelText('Publish only').click();
    await publishScreen.continueButton().click();

    await expect
      .element(publishScreen.confirmButton())
      .toHaveTextContent('Publish post, right now');
    await publishScreen.confirmButton().click();

    await expect.element(publishScreen.complete()).toBeInTheDocument();
    expect(dispatch).toHaveBeenCalledWith({ kind: 'publish', options: {} });
  });

  it('schedules a draft and hands over the scheduled celebration key', async () => {
    const { dispatch } = await renderPublishFlow();

    await publishScreen.setting('publish-at').click();
    await page.getByLabelText('Schedule for later').click();
    await publishScreen.continueButton().click();
    await publishScreen.confirmButton().click();

    await expect.element(publishScreen.complete()).toBeInTheDocument();

    const command = dispatch.mock.calls[0][0];
    expect(command.kind).toBe('schedule');
    expect(command).toMatchObject({
      options: { emailOnly: false, newsletter: 'weekly', emailSegment: EVERYONE },
    });
    const publishedAt = command.kind === 'schedule' ? command.options.publishedAt : '';
    expect(Date.parse(publishedAt)).toBeGreaterThan(Date.now());
    // The server rejects a sub-second publish time.
    expect(publishedAt).toMatch(/T\d\d:\d\d:\d\d\.000Z$/);
    expect(localStorage.getItem('ghost-last-scheduled-post')).not.toBeNull();
    expect(localStorage.getItem('ghost-last-published-post')).toBeNull();
  });

  // One pinned instant, two zones a day apart: whatever zone the runner uses, it
  // agrees with at most one of them, so a browser-day mapping fails at least one.
  it.each([
    ['Pacific/Auckland', '2026-09-04', '4'],
    ['Pacific/Honolulu', '2026-09-03', '3'],
  ])(
    'keeps the calendar on the site timezone day the field shows (%s)',
    async (timezone, date, day) => {
      await renderPublishFlow({ timezone, now: () => new Date('2026-09-03T20:00:00.000Z') });

      await publishScreen.setting('publish-at').click();
      await page.getByLabelText('Schedule for later').click();

      await expect.element(publishScreen.scheduleDate()).toHaveValue(date);
      await publishScreen.scheduleDate().click();

      const selected = page.getByRole('gridcell', { selected: true });
      await expect.element(selected).toHaveTextContent(day);

      // Committing the day the calendar highlights must not move the date.
      await selected.click();
      await expect.element(publishScreen.scheduleDate()).toHaveValue(date);
    },
  );

  it(
    'sends without publishing when the email-only type is chosen',
    async () => {
      fakeEmailPolling({ status: 'submitted' });
      const { dispatch } = await renderPublishFlow();

      await publishScreen.setting('publish-type').click();
      await page.getByLabelText('Email only').click();
      await publishScreen.continueButton().click();

      await expect
        .element(publishScreen.confirm())
        .toHaveTextContent('and will not be published on your site.');
      await publishScreen.confirmButton().click();

      await expect.element(publishScreen.complete()).toBeInTheDocument();
      expect(dispatch).toHaveBeenCalledWith({
        kind: 'publish',
        options: { emailOnly: true, newsletter: 'weekly', emailSegment: EVERYONE },
      });
    },
    SLOW,
  );

  it('gates the flow behind the TK reminder', async () => {
    await renderPublishFlow({ tkCount: 2 });

    await expect.element(publishScreen.tkReminder()).toHaveTextContent('2 TK reminders');
    await page.getByRole('button', { name: 'Continue to publish' }).click();

    await expect.element(publishScreen.options()).toBeInTheDocument();
  });

  it('warns about an ineffective public preview before opening the flow', async () => {
    await renderPublishFlow({
      paywallImprovements: true,
      post: draft({
        visibility: 'public',
        lexical: JSON.stringify({
          root: {
            children: [
              { type: 'paragraph', children: [{ type: 'text', text: 'a' }] },
              { type: 'paywall' },
              { type: 'paragraph', children: [{ type: 'text', text: 'b' }] },
            ],
          },
        }),
      }),
    });

    await expect
      .element(publishScreen.publicPreviewWarning())
      .toHaveTextContent('Public preview has no effect');
  });

  it('keeps the user on confirm when re-auth interrupts the publish', async () => {
    const dispatch = completesWith({ kind: 'needs-retry' });
    await renderPublishFlow({ dispatch });

    await publishScreen.continueButton().click();
    await publishScreen.confirmButton().click();

    await expect.element(publishScreen.confirmError()).toHaveTextContent('Your session expired');
    await expect.element(publishScreen.confirm()).toBeInTheDocument();
  });

  it('explains a collision instead of completing', async () => {
    const dispatch = completesWith(failed('conflict', 'Saving failed! Someone else is editing'));
    await renderPublishFlow({ dispatch });

    await publishScreen.continueButton().click();
    await publishScreen.confirmButton().click();

    await expect
      .element(publishScreen.confirmError())
      .toHaveTextContent('Someone else has edited this post');
  });

  it('links the upgrade phrase in a host limit without completing', async () => {
    const dispatch = completesWith(
      failed('host-limit', 'Your plan is full, please upgrade to publish more.'),
    );
    await renderPublishFlow({ dispatch });

    await publishScreen.continueButton().click();
    await publishScreen.confirmButton().click();

    await expect.element(publishScreen.confirmError()).toHaveTextContent('Your plan is full');
    await expect
      .element(publishScreen.confirmError().getByRole('link', { name: 'please upgrade' }))
      .toBeInTheDocument();
    expect(localStorage.getItem('ghost-last-published-post')).toBeNull();
  });

  it('blocks the options step on a publishing limit and links the upgrade phrase', async () => {
    await renderPublishFlow({
      limits: {
        checkPublishingLimit: () =>
          Promise.reject(
            new Error('You have reached your member limit, please upgrade your plan.'),
          ),
      },
    });

    await expect
      .element(publishScreen.options())
      .toHaveTextContent('You have reached your member limit');
    await expect
      .element(publishScreen.options().getByRole('link', { name: 'please upgrade' }))
      .toBeInTheDocument();
    // A blocked publish offers no way forward.
    await expect.element(publishScreen.continueButton()).not.toBeInTheDocument();
  });

  it(
    'completes with a note when the email cannot be confirmed either way',
    async () => {
      // The poller's reload fails, the way a 401 does with the redirect opted out.
      fakeAdminEndpoint(
        'GET',
        new RegExp(`^/posts/${POST_ID}/\\?`),
        { errors: [{ message: 'Authorization failed' }] },
        { status: 401 },
      );
      const { dispatch, onCompleted } = await renderPublishFlow();

      await publishScreen.continueButton().click();
      await publishScreen.confirmButton().click();

      await expect
        .element(publishScreen.completeNote())
        .toHaveTextContent('couldn’t confirm the newsletter was sent');
      await expect.element(publishScreen.complete()).toHaveTextContent('Boom. It’s out there.');
      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(onCompleted).toHaveBeenCalledTimes(1);
    },
    SLOW,
  );

  it(
    'never claims an email-only send landed when it could not be confirmed',
    async () => {
      fakeAdminEndpoint(
        'GET',
        new RegExp(`^/posts/${POST_ID}/\\?`),
        { errors: [{ message: 'Authorization failed' }] },
        { status: 401 },
      );
      await renderPublishFlow();

      await publishScreen.setting('publish-type').click();
      await page.getByLabelText('Email only').click();
      await publishScreen.continueButton().click();
      await publishScreen.confirmButton().click();

      await expect
        .element(publishScreen.completeNote())
        .toHaveTextContent('couldn’t confirm the newsletter was sent');
      // Nothing on the step may assert a send, or celebrate one.
      await expect
        .element(publishScreen.complete())
        .toHaveTextContent('Your post has been created');
      await expect.element(publishScreen.complete()).not.toHaveTextContent('has been sent');
      await expect.element(publishScreen.complete()).not.toHaveTextContent('was sent to');
      await expect.element(publishScreen.complete()).not.toHaveTextContent('Boom');
    },
    SLOW,
  );

  it('shows a validation failure in place', async () => {
    const dispatch = completesWith(failed('validation', 'Title cannot be longer than 255'));
    await renderPublishFlow({ dispatch });

    await publishScreen.continueButton().click();
    await publishScreen.confirmButton().click();

    await expect
      .element(publishScreen.confirmError())
      .toHaveTextContent('Validation failed: Title cannot be longer than 255');
    await expect.element(publishScreen.confirm()).toBeInTheDocument();
  });

  it('says a dropped command is no longer publishable', async () => {
    const dispatch = completesWith({ kind: 'dropped', reason: 'not-draft' });
    await renderPublishFlow({ dispatch });

    await publishScreen.continueButton().click();
    await publishScreen.confirmButton().click();

    await expect
      .element(publishScreen.confirmError())
      .toHaveTextContent('can no longer be published from here');
  });

  it('says a superseded command is no longer publishable', async () => {
    const dispatch = completesWith({ kind: 'superseded', by: 'publish' });
    await renderPublishFlow({ dispatch });

    await publishScreen.continueButton().click();
    await publishScreen.confirmButton().click();

    await expect
      .element(publishScreen.confirmError())
      .toHaveTextContent('can no longer be published from here');
  });

  it(
    'offers a retry when the email fails after a successful publish',
    async () => {
      fakeEmailPolling({ status: 'failed', error: 'Sending failed' }, { status: 'submitted' });
      const retryApi = fakeAdminEndpoint('PUT', `/emails/${EMAIL_ID}/retry/`, { emails: [] });
      await renderPublishFlow();

      await publishScreen.continueButton().click();
      await publishScreen.confirmButton().click();

      await expect.element(publishScreen.emailError()).toHaveTextContent('Sending failed');
      await publishScreen.retryEmailButton().click();

      await expect.element(publishScreen.complete()).toBeInTheDocument();
      expect(retryApi.requests).toHaveLength(1);
    },
    SLOW,
  );
});

describe('Update flow', () => {
  beforeEach(() => {
    fakeMemberCounts(20);
  });

  it('reverts a published post to a draft', async () => {
    const dispatch = completesWith(saved('draft'));
    const onClose = vi.fn();

    await render(
      <TestWrapper>
        <UpdateFlowModal
          dispatch={dispatch}
          post={draft({ status: 'published', publishedAt: '2026-09-01T09:00:00.000Z' })}
          site={SITE}
          timezone="Etc/UTC"
          user={USER}
          onClose={onClose}
        />
      </TestWrapper>,
    );

    await expect.element(publishScreen.updateFlowTitle()).toHaveTextContent('has been published');
    await publishScreen.revertToDraft().click();

    expect(dispatch).toHaveBeenCalledWith({ kind: 'revert' });
    await expect.poll(() => onClose.mock.calls.length).toBe(1);
  });

  it('names a since-archived newsletter a scheduled post was already sent to', async () => {
    await render(
      <TestWrapper>
        <UpdateFlowModal
          dispatch={completesWith(saved('draft'))}
          post={draft({
            status: 'scheduled',
            publishedAt: '2026-09-10T09:00:00.000Z',
            newsletter: 'retired',
            newsletterName: 'Retired Weekly',
            newsletterStatus: 'archived',
            email: { id: EMAIL_ID, email_count: 12, opened_count: 0 },
            emailCreatedAt: '2026-09-01T09:00:00.000Z',
          })}
          site={SITE}
          timezone="Etc/UTC"
          user={USER}
          onClose={() => {}}
        />
      </TestWrapper>,
    );

    await expect
      .element(publishScreen.updateFlowPreviousEmail())
      .toHaveTextContent('previously emailed to 12 subscribers of Retired Weekly');
    await expect
      .element(publishScreen.updateFlowPreviousEmail())
      .toHaveTextContent('on 1 Sep 2026 at 09:00');
  });
});
