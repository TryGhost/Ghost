import { afterEach, describe, expect, it } from 'vitest';
import { buildLexicalParagraph } from '@tryghost/test-data';

import {
  browseResponse,
  currentRoute,
  currentUserResponse,
  fakeAdminEndpoint,
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
  // The site-wide member total the publish machine reads; the boot entry counts a different shape.
  fakeAdminEndpoint('GET', /^\/members\/\?.*order=id/, {
    members: [],
    meta: { pagination: { page: 1, limit: 1, pages: 1, total: 20, next: null, prev: null } },
  });
}

/** A post whose newsletter failed; once a retry is accepted, every read reports it sent. */
function fakeFailedSend(overrides: Partial<Post>) {
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
    email: { id: EMAIL_ID, status: 'failed', error: SEND_ERROR, email_count: 20, opened_count: 0 },
    ...overrides,
  });
  let current = failed;

  fakeAdminEndpoint('GET', new RegExp(`^/posts/${POST_ID}/\\?`), () => ({ posts: [current] }));

  return fakeAdminEndpoint('PUT', `/emails/${EMAIL_ID}/retry/`, () => {
    current = {
      ...failed,
      email: { id: EMAIL_ID, status: 'submitted', error: null, email_count: 20, opened_count: 0 },
    };
    return { emails: [current.email] };
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
  it('retries a published post’s failed newsletter from View details', async () => {
    publishChrome();
    const retryApi = fakeFailedSend({ status: 'published' });
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await expect
      .element(editorScreen.status())
      .toHaveTextContent('Published but failed to send newsletter.');
    await expect.element(editorScreen.viewNewsletterDetails()).toBeEnabled();
    await editorScreen.viewNewsletterDetails().click();

    await expect
      .element(publishScreen.emailError())
      .toHaveTextContent('Your post has been published but the email failed to send.');
    await expect.element(publishScreen.emailError()).toHaveTextContent(SEND_ERROR);
    await publishScreen.retryEmailButton().click();

    await expect
      .element(publishScreen.complete())
      .toHaveTextContent('Your post has been published.');
    expect(retryApi.requests).toHaveLength(1);
    await expect
      .element(editorScreen.status())
      .toHaveTextContent('Published and sent to 20 members');
    await expect(editorScreen.viewNewsletterDetails()).toHaveCount(0);
  });

  it('retries an email-only send’s failed newsletter from Retry now', async () => {
    publishChrome();
    const retryApi = fakeFailedSend({ status: 'sent', email_only: true });
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await expect.element(editorScreen.status()).toHaveTextContent('Failed to send newsletter.');
    await expect.element(editorScreen.retryNewsletter()).toBeEnabled();
    await editorScreen.retryNewsletter().click();

    await expect
      .element(publishScreen.emailError())
      .toHaveTextContent('Your post has been created but the email failed to send.');
    await expect.element(publishScreen.emailError()).toHaveTextContent(SEND_ERROR);
    await publishScreen.retryEmailButton().click();

    await expect.element(publishScreen.complete()).toHaveTextContent('Your email has been sent.');
    expect(retryApi.requests).toHaveLength(1);
    await expect.element(editorScreen.status()).toHaveTextContent('Sent to 20 members');
    await expect(editorScreen.retryNewsletter()).toHaveCount(0);
  });

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

  it('never offers a Contributor the retry', async () => {
    publishChrome();
    const retryApi = fakeFailedSend({ status: 'sent', email_only: true });
    await renderAdminApp(`/editor/post/${POST_ID}`, asRole('Contributor'));

    // A Contributor is returned to the list from any post that is no longer a draft.
    await expect.poll(currentRoute).toBe('/posts');
    await expect(editorScreen.status()).toHaveCount(0);
    await expect(editorScreen.retryNewsletter()).toHaveCount(0);
    expect(retryApi.requests).toHaveLength(0);
  });
});
