import { afterEach, describe, expect, it } from 'vitest';
import { buildLexicalParagraph } from '@tryghost/test-data';

import {
  browseResponse,
  currentRoute,
  currentUserResponse,
  fakeAdminEndpoint,
  fakeAdminStats,
  fakeNewsletters,
  fakePosts,
  fakeSnippets,
  newsletter,
  post,
  renderAdminApp,
  staffRole,
  type Post,
  type StaffRoleName,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';
import { publishScreen } from '@/editor/publish/publish.screen';
import { deferred } from '@/utils/deferred';

const POST_ID = 'abc123';
const EMAIL_ID = 'email-1';
const FLAG_ON = { labs: { editorReact: true } };
const SEND_ERROR = 'The email service was unavailable.';
const CURRENT_USER_ID = String(currentUserResponse().users[0].id);

function weeklyNewsletters() {
  return [newsletter({ slug: 'weekly', name: 'Weekly', status: 'active' })];
}

/** Every read the header's publish inputs and the flow make beyond the boot table. */
function publishChrome() {
  fakeSnippets([]);
  fakePosts([]);
  fakeNewsletters(weeklyNewsletters());
  // Successful retries leave the editor for the post's analytics screen.
  fakeAdminStats.postReferrers(POST_ID, []);
  fakeAdminStats.postGrowth(POST_ID);
  fakeAdminStats.mrr();
  // The site-wide member total the publish machine reads; the boot entry counts a different shape.
  fakeAdminEndpoint('GET', /^\/members\/\?.*order=id/, {
    members: [],
    meta: { pagination: { page: 1, limit: 1, pages: 1, total: 20, next: null, prev: null } },
  });
}

/** The publish flow's email confirmation reads the post with its email alone. */
function isConfirmationRead(url: string): boolean {
  return new URL(url).searchParams.get('include') === 'email';
}

/**
 * A post whose newsletter failed, answering a retry as Core does: the retry
 * leaves the email pending, and it is sent by the time the flow polls for it.
 */
function fakeFailedSend(overrides: Partial<Post>, error: string | null = SEND_ERROR) {
  const failedEmail: NonNullable<Post['email']> = {
    id: EMAIL_ID,
    status: 'failed',
    error,
    email_count: 20,
    opened_count: 0,
  };
  const failed = post({
    id: POST_ID,
    title: 'Hello from React',
    slug: 'hello-from-react',
    url: 'http://test.com/hello-from-react/',
    lexical: buildLexicalParagraph('Hello from React'),
    updated_at: '2026-01-01T00:00:00.000Z',
    published_at: '2026-01-01T00:00:00.000Z',
    tags: [],
    authors: [{ id: CURRENT_USER_ID }],
    email: failedEmail,
    ...overrides,
  });
  let email = failedEmail;

  fakeAdminEndpoint('GET', new RegExp(`^/posts/${POST_ID}/\\?`), ({ url }) => {
    if (email.status === 'pending' && isConfirmationRead(url)) {
      email = { ...email, status: 'submitted', error: null };
    }
    return { posts: [{ ...failed, email }] };
  });

  return fakeAdminEndpoint('PUT', `/emails/${EMAIL_ID}/retry/`, () => {
    // Core patches only the status, so the pending email keeps its last error.
    email = { ...failedEmail, status: 'pending' };
    return { emails: [email] };
  });
}

function asRole(name: StaffRoleName) {
  const me = currentUserResponse();
  me.users[0].roles = [staffRole({ name })];
  return { ...FLAG_ON, boot: { browseMe: { response: me } } };
}

afterEach(() => {
  localStorage.removeItem('ghost-last-published-post');
  localStorage.removeItem('ghost-last-scheduled-post');
});

/**
 * A send that failed after the publish flow stopped watching it: the status
 * line leads back into the flow at its email-failure step, where it is retried.
 */
describe('Editor newsletter retry', () => {
  it.each([SEND_ERROR, null, ''])(
    'retries a published post’s failed newsletter from View details with error %j',
    async (error) => {
      publishChrome();
      const retryApi = fakeFailedSend({ status: 'published' }, error);
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

      await expect
        .element(editorScreen.status())
        .toHaveTextContent('Published but failed to send newsletter.');
      await expect.element(editorScreen.viewNewsletterDetails()).toBeEnabled();
      await editorScreen.viewNewsletterDetails().click();

      await expect
        .element(publishScreen.emailError())
        .toHaveTextContent('Your post has been published but the email failed to send.');
      await expect.element(publishScreen.emailError()).toHaveTextContent(error || 'Unknown error');
      await publishScreen.retryEmailButton().click();

      await expect.poll(currentRoute).toBe(`/posts/analytics/${POST_ID}`);
      expect(retryApi.requests).toHaveLength(1);
      await expect(editorScreen.root()).toHaveCount(0);
      await expect(publishScreen.root()).toHaveCount(0);
    },
  );

  it.each([SEND_ERROR, null, ''])(
    'retries an email-only send’s failed newsletter from Retry now with error %j',
    async (error) => {
      publishChrome();
      const retryApi = fakeFailedSend({ status: 'sent', email_only: true }, error);
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

      await expect.element(editorScreen.status()).toHaveTextContent('Failed to send newsletter.');
      await expect.element(editorScreen.retryNewsletter()).toBeEnabled();
      await editorScreen.retryNewsletter().click();

      await expect
        .element(publishScreen.emailError())
        .toHaveTextContent('Your post has been created but the email failed to send.');
      await expect.element(publishScreen.emailError()).toHaveTextContent(error || 'Unknown error');
      await publishScreen.retryEmailButton().click();

      await expect.poll(currentRoute).toBe(`/posts/analytics/${POST_ID}`);
      expect(retryApi.requests).toHaveLength(1);
      await expect(editorScreen.root()).toHaveCount(0);
      await expect(publishScreen.root()).toHaveCount(0);
    },
  );

  it('holds the way back into the flow until the publish inputs load', async () => {
    publishChrome();
    const newslettersLoaded = deferred<void>();
    // Registered after publishChrome's newsletters fake, so this one answers.
    fakeAdminEndpoint('GET', /^\/newsletters\//, async () => {
      await newslettersLoaded.promise;
      return browseResponse('newsletters', weeklyNewsletters(), { limit: 'all' });
    });
    fakeFailedSend({ status: 'published' });
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    try {
      await expect
        .element(editorScreen.status())
        .toHaveTextContent('Published but failed to send newsletter.');
      await expect.element(editorScreen.viewNewsletterDetails()).toBeDisabled();
    } finally {
      newslettersLoaded.resolve();
    }

    await expect.element(editorScreen.viewNewsletterDetails()).toBeEnabled();
    await editorScreen.viewNewsletterDetails().click();
    await expect.element(publishScreen.emailError()).toBeVisible();
  });

  it('offers no retry on a past-scheduled post carrying an earlier failed send', async () => {
    publishChrome();
    fakeFailedSend({ status: 'scheduled' });
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    // The flow would open this post at its options, not at the failed send.
    await expect
      .element(editorScreen.status())
      .toHaveTextContent('Published but failed to send newsletter.');
    await expect.element(editorScreen.unscheduleButton()).toBeVisible();
    await expect(editorScreen.viewNewsletterDetails()).toHaveCount(0);
  });

  it('shows an Author the failed send without a retry, which Core refuses them', async () => {
    publishChrome();
    fakeFailedSend({ status: 'published' });
    await renderAdminApp(`/editor/post/${POST_ID}`, asRole('Author'));

    await expect
      .element(editorScreen.status())
      .toHaveTextContent('Published but failed to send newsletter.');
    // Authors keep the header's publish controls; only the retry is withheld.
    await expect.element(editorScreen.unpublishButton()).toBeVisible();
    await expect(editorScreen.viewNewsletterDetails()).toHaveCount(0);
  });
});
