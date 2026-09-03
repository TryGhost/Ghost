import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { StrictMode } from 'react';

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

afterEach(() => {
  localStorage.removeItem('ghost-last-published-post');
  localStorage.removeItem('ghost-last-scheduled-post');
});

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
  const renderModal = (nextProps: Partial<React.ComponentProps<typeof PublishFlowModal>> = {}) => (
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
        {...nextProps}
      />
    </TestWrapper>
  );

  const rendered = await render(renderModal());

  return {
    dispatch,
    onCompleted,
    rerender: (nextProps: Partial<React.ComponentProps<typeof PublishFlowModal>>) =>
      rendered.rerender(renderModal(nextProps)),
    unmount: () => rendered.unmount(),
  };
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
      const { dispatch, onCompleted } = await renderPublishFlow();

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
      expect(onCompleted).toHaveBeenCalledTimes(1);
      expect(onCompleted).toHaveBeenCalledWith({
        postId: POST_ID,
        isScheduled: false,
        hasEmail: true,
      });
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

  it('completes nothing when the flow is torn down during the save', async () => {
    let finishDispatch: (completion: SaveCompletion) => void = () => {};
    const dispatch = vi.fn(
      () =>
        new Promise<SaveCompletion>((resolve) => {
          finishDispatch = resolve;
        }),
    );
    const { onCompleted, unmount } = await renderPublishFlow({ dispatch });

    await publishScreen.continueButton().click();
    await publishScreen.confirmButton().click();
    await expect.poll(() => dispatch.mock.calls.length).toBe(1);

    await unmount();
    finishDispatch(saved());
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });

    expect(onCompleted).not.toHaveBeenCalled();
    expect(localStorage.getItem('ghost-last-published-post')).toBeNull();
  });

  it('cannot return to settings or dispatch twice while the save is running', async () => {
    let finishDispatch: (completion: SaveCompletion) => void = () => {};
    const dispatch = vi.fn(
      () =>
        new Promise<SaveCompletion>((resolve) => {
          finishDispatch = resolve;
        }),
    );
    await renderPublishFlow({ dispatch });

    await publishScreen.continueButton().click();
    await publishScreen.confirmButton().click();
    await expect.poll(() => dispatch.mock.calls.length).toBe(1);
    await expect.element(publishScreen.backToSettings()).toBeDisabled();

    publishScreen
      .backToSettings()
      .element()
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    publishScreen
      .confirmButton()
      .element()
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await expect.element(publishScreen.confirm()).toBeInTheDocument();
    expect(dispatch).toHaveBeenCalledTimes(1);

    finishDispatch(saved());
    await expect.element(publishScreen.complete()).toBeInTheDocument();
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

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

  it('cannot continue with Email only after clearing every recipient', async () => {
    await renderPublishFlow();

    await publishScreen.setting('publish-type').click();
    await page.getByLabelText('Email only').click();
    await publishScreen.setting('email-recipients').click();
    await publishScreen.recipientFree().click();

    await expect.element(publishScreen.continueButton()).toBeDisabled();
    publishScreen
      .continueButton()
      .element()
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await expect.element(publishScreen.options()).toBeInTheDocument();
  });

  it('loads every page before exposing tier and label recipients', async () => {
    const pagination = (pageNumber: number) => ({
      page: pageNumber,
      limit: 100,
      pages: 2,
      total: 2,
      next: pageNumber === 1 ? 2 : null,
      prev: pageNumber === 2 ? 1 : null,
    });
    const tiersApi = fakeAdminEndpoint('GET', /^\/tiers\/\?/, ({ url }) => {
      const pageNumber = Number(new URL(url).searchParams.get('page') ?? '1');

      return {
        tiers: [
          pageNumber === 1
            ? { slug: 'first-tier', name: 'First tier', active: true }
            : { slug: 'last-tier', name: 'Last tier', active: true },
        ],
        meta: { pagination: pagination(pageNumber) },
      };
    });
    const labelsApi = fakeAdminEndpoint('GET', /^\/labels\/\?/, ({ url }) => {
      const pageNumber = Number(new URL(url).searchParams.get('page') ?? '1');

      return {
        labels: [
          pageNumber === 1
            ? { slug: 'first-label', name: 'First label' }
            : { slug: 'last-label', name: 'Last label' },
        ],
        meta: { pagination: pagination(pageNumber) },
      };
    });

    await renderPublishFlow();
    await publishScreen.setting('email-recipients').click();
    await expect.poll(() => tiersApi.requests.length).toBe(2);
    await expect.poll(() => labelsApi.requests.length).toBe(2);
    await expect.element(page.getByLabelText('Specific people')).toBeInTheDocument();
    await page.getByLabelText('Specific people').click();
    await expect.element(page.getByLabelText('First tier')).toBeInTheDocument();
    await expect.element(page.getByLabelText('Last tier')).toBeInTheDocument();
    await expect.element(page.getByLabelText('First label')).toBeInTheDocument();
    await expect.element(page.getByLabelText('Last label')).toBeInTheDocument();
    expect(new URL(tiersApi.requests[1].url).searchParams.get('page')).toBe('2');
    expect(new URL(labelsApi.requests[1].url).searchParams.get('page')).toBe('2');
  });

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

  it('recovers when the publish dispatcher rejects unexpectedly', async () => {
    const dispatch = vi.fn(() => Promise.reject(new Error('The save engine stopped')));
    await renderPublishFlow({ dispatch });

    await publishScreen.continueButton().click();
    await publishScreen.confirmButton().click();

    await expect.element(publishScreen.confirmError()).toHaveTextContent('The save engine stopped');
    await expect
      .poll(() => publishScreen.confirmButton().element().hasAttribute('disabled'))
      .toBe(false);
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

  it('rechecks limit readiness when the mounted flow moves to another post', async () => {
    let finishSecondCheck: () => void = () => {};
    const secondCheck = () =>
      new Promise<void>((resolve) => {
        finishSecondCheck = resolve;
      });
    const rendered = await renderPublishFlow();

    await expect
      .poll(() => publishScreen.continueButton().element().hasAttribute('disabled'))
      .toBe(false);
    await publishScreen.continueButton().click();
    await expect.element(publishScreen.confirm()).toBeInTheDocument();

    await rendered.rerender({
      post: draft({ id: 'post-2' }),
      limits: { checkPublishingLimit: secondCheck },
    });

    await expect.element(publishScreen.options()).toBeInTheDocument();
    await expect
      .poll(() => publishScreen.continueButton().element().hasAttribute('disabled'))
      .toBe(true);
    finishSecondCheck();
    await expect
      .poll(() => publishScreen.continueButton().element().hasAttribute('disabled'))
      .toBe(false);
  });

  it('blocks on an unreadable limit and retries it safely', async () => {
    let attempt = 0;
    const refreshSettings = vi.fn(() => {
      attempt += 1;
      return attempt === 1 ? Promise.reject(new Error('Settings are offline')) : Promise.resolve();
    });
    await renderPublishFlow({
      limits: { refreshSettings },
    });

    await expect.element(publishScreen.limitsError()).toHaveTextContent('Settings are offline');
    await expect.element(publishScreen.continueButton()).toBeDisabled();
    await publishScreen.limitsError().getByRole('button', { name: 'Try again' }).click();
    await expect
      .poll(() => publishScreen.continueButton().element().hasAttribute('disabled'))
      .toBe(false);
    expect(refreshSettings).toHaveBeenCalledTimes(2);
  });

  it('completes once when React StrictMode replays effect cleanup', async () => {
    const dispatch = completesWith(saved());
    const onCompleted = vi.fn();
    let releaseSettings: () => void = () => {};
    const refreshSettings = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          releaseSettings = resolve;
        }),
    );
    const checkSendingLimit = vi.fn(() => Promise.resolve());
    const checkPublishingLimit = vi.fn(() => Promise.resolve());

    await render(
      <StrictMode>
        <TestWrapper>
          <PublishFlowModal
            dispatch={dispatch}
            limits={{ refreshSettings, checkSendingLimit, checkPublishingLimit }}
            post={draft()}
            site={{ ...SITE, mailgunConfigured: false }}
            timezone="Etc/UTC"
            user={USER}
            onClose={() => {}}
            onCompleted={onCompleted}
          />
        </TestWrapper>
      </StrictMode>,
    );

    await expect.poll(() => refreshSettings.mock.calls.length).toBe(1);
    expect(checkPublishingLimit).toHaveBeenCalledTimes(1);
    await expect.element(publishScreen.continueButton()).toBeDisabled();
    releaseSettings();
    await expect
      .poll(() => publishScreen.continueButton().element().hasAttribute('disabled'))
      .toBe(false);
    expect(checkSendingLimit).toHaveBeenCalledTimes(1);
    expect(checkPublishingLimit).toHaveBeenCalledTimes(1);
    await publishScreen.continueButton().click();
    await publishScreen.confirmButton().click();

    await expect.element(publishScreen.complete()).toBeInTheDocument();
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(onCompleted).toHaveBeenCalledTimes(1);
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

  it(
    'never claims an email-only send landed when the reload has no email',
    async () => {
      fakeAdminEndpoint('GET', new RegExp(`^/posts/${POST_ID}/\\?`), {
        posts: [{ id: POST_ID, status: 'published', email: null }],
      });
      const { onCompleted } = await renderPublishFlow();

      await publishScreen.setting('publish-type').click();
      await page.getByLabelText('Email only').click();
      await publishScreen.continueButton().click();
      await publishScreen.confirmButton().click();

      await expect
        .element(publishScreen.completeNote())
        .toHaveTextContent('couldn’t confirm the newsletter was sent');
      await expect
        .element(publishScreen.complete())
        .toHaveTextContent('Your post has been created');
      await expect.element(publishScreen.complete()).not.toHaveTextContent('email has been sent');
      expect(onCompleted).toHaveBeenCalledWith({
        postId: POST_ID,
        isScheduled: false,
        hasEmail: false,
      });
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

  it('reports a retry failure when the failed email has no id', async () => {
    await renderPublishFlow({
      post: draft({
        status: 'published',
        email: { email_count: 0, opened_count: 0, status: 'failed', error: 'Sending failed' },
      }),
    });

    await publishScreen.retryEmailButton().click();

    await expect
      .element(publishScreen.emailError().getByRole('alert'))
      .toHaveTextContent('Unknown Error occurred when attempting to resend');
  });

  it('describes an at-open failed email-only post as created, not published', async () => {
    await renderPublishFlow({
      post: draft({
        status: 'sent',
        email: {
          id: EMAIL_ID,
          email_count: 20,
          opened_count: 0,
          status: 'failed',
          error: 'Sending failed',
        },
      }),
    });

    await expect
      .element(publishScreen.emailError())
      .toHaveTextContent('Your post has been created but the email failed to send.');
    await expect.element(publishScreen.emailError()).not.toHaveTextContent('has been published');
  });

  it('takes a draft with a failed historic email through the normal publish dispatch', async () => {
    const { dispatch } = await renderPublishFlow({
      post: draft({
        email: {
          id: EMAIL_ID,
          email_count: 20,
          opened_count: 0,
          status: 'failed',
          error: 'Sending failed',
        },
      }),
    });

    await expect.element(publishScreen.options()).toBeInTheDocument();
    await publishScreen.continueButton().click();
    await publishScreen.confirmButton().click();

    await expect.element(publishScreen.complete()).toBeInTheDocument();
    expect(dispatch).toHaveBeenCalledWith({
      kind: 'publish',
      options: { emailOnly: false },
    });
  });

  it.each([null, 'all'])(
    'describes a historic %s segment without using the current default',
    async (emailSegment) => {
      await renderPublishFlow({
        post: draft({
          email: { id: EMAIL_ID, email_count: 12, opened_count: 0, status: 'submitted' },
          emailSegment,
        }),
        site: {
          ...SITE,
          editorDefaultEmailRecipients: 'filter',
          editorDefaultEmailRecipientsFilter: 'status:free',
        },
      });

      await expect
        .element(publishScreen.alreadySent())
        .toHaveTextContent('Already sent to 12 subscribers');
      await expect.element(publishScreen.alreadySent()).not.toHaveTextContent('free');
      await expect.element(publishScreen.alreadySent()).not.toHaveTextContent('specific');
      await expect.element(publishScreen.alreadySent()).not.toHaveTextContent('none');
    },
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

  it('reverts once when React StrictMode replays effect cleanup', async () => {
    const dispatch = completesWith(saved('draft'));
    const onClose = vi.fn();
    const onReverted = vi.fn();

    await render(
      <StrictMode>
        <TestWrapper>
          <UpdateFlowModal
            dispatch={dispatch}
            post={draft({ status: 'published', publishedAt: '2026-09-01T09:00:00.000Z' })}
            site={SITE}
            timezone="Etc/UTC"
            user={USER}
            onClose={onClose}
            onReverted={onReverted}
          />
        </TestWrapper>
      </StrictMode>,
    );

    await publishScreen.revertToDraft().click();

    await expect.poll(() => onClose.mock.calls.length).toBe(1);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(onReverted).toHaveBeenCalledTimes(1);
  });

  it('recovers when the revert dispatcher rejects unexpectedly', async () => {
    const dispatch = vi.fn(() => Promise.reject(new Error('The revert stopped')));
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

    await publishScreen.revertToDraft().click();

    await expect
      .element(publishScreen.updateFlow().getByRole('alert'))
      .toHaveTextContent('The revert stopped');
    await expect
      .poll(() => publishScreen.revertToDraft().element().hasAttribute('disabled'))
      .toBe(false);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('abandons a pending revert when the update flow closes', async () => {
    let finishDispatch: (completion: SaveCompletion) => void = () => {};
    const dispatch = vi.fn(
      () =>
        new Promise<SaveCompletion>((resolve) => {
          finishDispatch = resolve;
        }),
    );
    const onClose = vi.fn();
    const onReverted = vi.fn();

    await render(
      <TestWrapper>
        <UpdateFlowModal
          dispatch={dispatch}
          post={draft({ status: 'published', publishedAt: '2026-09-01T09:00:00.000Z' })}
          site={SITE}
          timezone="Etc/UTC"
          user={USER}
          onClose={onClose}
          onReverted={onReverted}
        />
      </TestWrapper>,
    );

    await publishScreen.revertToDraft().click();
    await expect.poll(() => dispatch.mock.calls.length).toBe(1);
    await publishScreen.updateFlow().getByRole('button', { name: 'Close' }).click();
    expect(onClose).toHaveBeenCalledTimes(1);

    finishDispatch(saved('draft'));
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });

    expect(onReverted).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('abandons a pending revert when the mounted update flow changes posts', async () => {
    let finishDispatch: (completion: SaveCompletion) => void = () => {};
    const dispatch = vi.fn(
      () =>
        new Promise<SaveCompletion>((resolve) => {
          finishDispatch = resolve;
        }),
    );
    const onClose = vi.fn();
    const onReverted = vi.fn();
    const modal = (post: PublishFlowPost) => (
      <TestWrapper>
        <UpdateFlowModal
          dispatch={dispatch}
          post={post}
          site={SITE}
          timezone="Etc/UTC"
          user={USER}
          onClose={onClose}
          onReverted={onReverted}
        />
      </TestWrapper>
    );
    const rendered = await render(
      modal(draft({ status: 'published', publishedAt: '2026-09-01T09:00:00.000Z' })),
    );

    await publishScreen.revertToDraft().click();
    await expect.poll(() => dispatch.mock.calls.length).toBe(1);
    await rendered.rerender(
      modal(
        draft({
          id: 'post-2',
          status: 'scheduled',
          publishedAt: '2026-09-10T09:00:00.000Z',
        }),
      ),
    );
    await expect.element(publishScreen.updateFlowTitle()).toHaveTextContent('scheduled');

    finishDispatch(saved('draft'));
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });

    expect(onReverted).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    await expect.element(publishScreen.updateFlow().getByRole('alert')).not.toBeInTheDocument();
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
    await expect
      .element(publishScreen.updateFlowConfirmation())
      .toHaveTextContent('published on your site');
  });

  it('describes the audience for a scheduled email that has not been sent yet', async () => {
    await render(
      <TestWrapper>
        <UpdateFlowModal
          dispatch={completesWith(saved('draft'))}
          post={draft({
            status: 'scheduled',
            publishedAt: '2026-09-10T09:00:00.000Z',
            newsletter: 'weekly',
            newsletterName: 'Weekly',
            emailSegment: EVERYONE,
          })}
          site={SITE}
          timezone="Etc/UTC"
          user={USER}
          onClose={() => {}}
        />
      </TestWrapper>,
    );

    await expect
      .element(publishScreen.updateFlowConfirmation())
      .toHaveTextContent('published and sent to 20 subscribers');
  });

  it('does not claim a scheduled email-only post will be published', async () => {
    await render(
      <TestWrapper>
        <UpdateFlowModal
          dispatch={completesWith(saved('draft'))}
          post={draft({
            status: 'scheduled',
            publishedAt: '2026-09-10T09:00:00.000Z',
            newsletter: 'weekly',
            newsletterName: 'Weekly',
            emailSegment: EVERYONE,
            emailOnly: true,
          })}
          site={SITE}
          timezone="Etc/UTC"
          user={USER}
          onClose={() => {}}
        />
      </TestWrapper>,
    );

    await expect
      .element(publishScreen.updateFlowConfirmation())
      .toHaveTextContent('will be sent to 20 subscribers');
    await expect
      .element(publishScreen.updateFlowConfirmation())
      .not.toHaveTextContent('published and sent');
  });

  it('does not count the current default newsletter for a missing persisted newsletter', async () => {
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
            emailSegment: 'label:vip',
          })}
          site={SITE}
          timezone="Etc/UTC"
          user={USER}
          onClose={() => {}}
        />
      </TestWrapper>,
    );

    await expect
      .element(publishScreen.updateFlowConfirmation())
      .toHaveTextContent('published and sent to subscribers of Retired Weekly');
    await expect
      .element(publishScreen.updateFlowConfirmation())
      .not.toHaveTextContent('20 subscribers');
  });

  it('does not replace a missing persisted segment with the current site default', async () => {
    await render(
      <TestWrapper>
        <UpdateFlowModal
          dispatch={completesWith(saved('draft'))}
          post={draft({
            status: 'scheduled',
            publishedAt: '2026-09-10T09:00:00.000Z',
            newsletter: 'weekly',
            newsletterName: 'Weekly',
            emailSegment: null,
          })}
          site={SITE}
          timezone="Etc/UTC"
          user={USER}
          onClose={() => {}}
        />
      </TestWrapper>,
    );

    await expect
      .element(publishScreen.updateFlowConfirmation())
      .toHaveTextContent('published and sent to subscribers');
    await expect
      .element(publishScreen.updateFlowConfirmation())
      .not.toHaveTextContent('20 subscribers');
  });

  it('does not claim that a failed published email was sent', async () => {
    await render(
      <TestWrapper>
        <UpdateFlowModal
          dispatch={completesWith(saved('draft'))}
          post={draft({
            status: 'published',
            publishedAt: '2026-09-10T09:00:00.000Z',
            newsletter: 'weekly',
            newsletterName: 'Weekly',
            email: {
              id: EMAIL_ID,
              email_count: 12,
              opened_count: 0,
              status: 'failed',
            },
          })}
          site={SITE}
          timezone="Etc/UTC"
          user={USER}
          onClose={() => {}}
        />
      </TestWrapper>,
    );

    await expect
      .element(publishScreen.updateFlowConfirmation())
      .toHaveTextContent('published on your site');
  });
});
