import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { buildLexicalParagraph } from '@tryghost/test-data';

import {
  configResponse,
  currentRoute,
  currentUserResponse,
  fakeAdminEndpoint,
  fakeAdminStats,
  fakeEmailPreview,
  fakeLabels,
  fakeNewsletters,
  fakePages,
  fakePosts,
  fakePostsListScreen,
  fakeSnippets,
  fakeTiers,
  label,
  newsletter,
  post,
  renderAdminApp,
  settingsResponse,
  submittedPost,
  tier,
  type Newsletter,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';
import { previewScreen } from '@/editor/preview/preview.screen';
import { publishScreen } from '@/editor/publish/publish.screen';
import { deferred } from '@/utils/deferred';

const POST_ID = 'abc123';
const POST_UUID = 'post-uuid';
const SITE_URL = 'http://test.com';
const CURRENT_USER = currentUserResponse().users[0];

const WEEKLY = newsletter({ slug: 'weekly', name: 'Weekly', status: 'active' });
const MONTHLY = newsletter({ slug: 'monthly-roundup', name: 'Monthly roundup', status: 'active' });

const SESSION_GONE = {
  errors: [{ type: 'UnauthorizedError', message: 'Authorization failed' }],
};
const PASSWORD = 'hunter22';

/** A site whose bulk email provider is configured, so the flow offers a send. */
function emailSite(settings: Record<string, unknown> = {}) {
  return {
    labs: { editorReact: true },
    boot: {
      browseSettings: {
        response: settingsResponse({
          settings: {
            mailgun_domain: 'mail.test.com',
            mailgun_api_key: 'key',
            mailgun_base_url: 'https://api.mailgun.net/v3',
            ...settings,
          },
        }),
      },
    },
  };
}

/**
 * The reads the header's publish inputs, preview and email size check make,
 * plus the screens a publish leaves for.
 */
function publishChrome(newsletters: Newsletter[]) {
  fakeSnippets([]);
  fakePosts([]);
  fakePages([]);
  fakeEmailPreview();
  fakePostsListScreen();
  fakeAdminStats.postReferrers(POST_ID, []);
  fakeAdminStats.postGrowth(POST_ID);
  fakeAdminStats.mrr();
  fakeNewsletters(newsletters);
  fakeAdminEndpoint('GET', /^\/members\/\?.*order=id/, {
    members: [],
    meta: { pagination: { page: 1, limit: 1, pages: 1, total: 20, next: null, prev: null } },
  });
}

/**
 * A draft that answers saves the way Ghost does: a send creates the email
 * pending, and the flow's email confirmation reads it back as submitted.
 */
function fakeSavableDraft(overrides: Record<string, unknown> = {}) {
  let current: Record<string, unknown> = {
    ...post({
      id: POST_ID,
      uuid: POST_UUID,
      title: 'Hello from React',
      slug: 'hello-from-react',
      status: 'draft',
      url: `${SITE_URL}/hello-from-react/`,
      lexical: buildLexicalParagraph('Hello from React'),
      updated_at: '2026-01-01T00:00:00.000Z',
      published_at: null,
      tags: [],
      authors: [{ id: String(CURRENT_USER.id) }],
    }),
    ...overrides,
  };
  let saves = 0;

  fakeAdminEndpoint('GET', new RegExp(`^/posts/${POST_ID}/\\?`), ({ url }) => {
    const email = current.email as { status: string } | null | undefined;
    if (email?.status === 'pending' && new URL(url).searchParams.get('include') === 'email') {
      current.email = { ...email, status: 'submitted', error: null };
    }
    return { posts: [current] };
  });

  return fakeAdminEndpoint('PUT', new RegExp(`^/posts/${POST_ID}/\\?`), ({ body, url }) => {
    saves += 1;
    const submitted = (body as { posts: Record<string, unknown>[] }).posts[0];
    current = { ...current, ...submitted, updated_at: `2026-01-01T00:00:0${saves}.000Z` };
    if (url.includes('newsletter=')) {
      current.email = { id: 'email-1', status: 'pending', email_count: 20, opened_count: 0 };
    }
    return { posts: [current] };
  });
}

/** Opens the preview's email and sends a test to the current user. */
async function sendTestFromPreview() {
  await editorScreen.previewButton().click();
  await previewScreen.emailTab().click();
  await previewScreen.testEmailButton().click();
  await previewScreen.sendTestEmailButton().click();
}

afterEach(() => {
  localStorage.removeItem('ghost-last-published-post');
  localStorage.removeItem('ghost-last-scheduled-post');
});

/** Publish and preview journeys from the editor header through to the request they send. */
describe('Editor publish journeys', () => {
  it('publishes and sends to specific tiers and labels', async () => {
    publishChrome([WEEKLY]);
    fakeTiers([
      tier({ slug: 'gold', name: 'Gold', active: true }),
      tier({ slug: 'silver', name: 'Silver', active: true }),
    ]);
    fakeLabels([label({ slug: 'vip', name: 'VIP' })]);
    const saveApi = fakeSavableDraft();
    await renderAdminApp(`/editor/post/${POST_ID}`, emailSite());

    await expect.element(editorScreen.publishButton()).toBeEnabled();
    await editorScreen.publishButton().click();
    await publishScreen.setting('email-recipients').click();
    await publishScreen.recipientFree().click();
    await publishScreen.recipientSpecific().click();
    await publishScreen.recipientSearch().click();
    await publishScreen.recipientOption('Gold').click();
    await publishScreen.recipientSearch().click();
    await publishScreen.recipientOption('VIP').click();
    // The list stays open after a pick, over the Continue button at Admin's 10px rem.
    await publishScreen.options().getByRole('heading', { name: 'Ready, set, publish.' }).click();
    await publishScreen.continueButton().click();
    await publishScreen.confirmButton().click();

    await expect.poll(currentRoute).toBe(`/posts/analytics/${POST_ID}`);
    expect(submittedPost(saveApi)).toMatchObject({ status: 'published' });
    const params = new URL(saveApi.lastRequest?.url ?? '').searchParams;
    expect(params.get('newsletter')).toBe('weekly');
    expect(params.get('email_segment')).toBe('tier:gold,label:vip');
  });

  it('offers no email options while member signup is off', async () => {
    publishChrome([WEEKLY]);
    fakeTiers([]);
    fakeLabels([]);
    const saveApi = fakeSavableDraft();
    await renderAdminApp(`/editor/post/${POST_ID}`, emailSite({ members_signup_access: 'none' }));

    await expect.element(editorScreen.publishButton()).toBeEnabled();
    await editorScreen.publishButton().click();
    await expect.element(publishScreen.options()).toBeVisible();
    await expect
      .element(publishScreen.setting('publish-type'))
      .toHaveTextContent('Publish on site');
    await expect.element(publishScreen.setting('publish-type')).toBeDisabled();
    await expect(publishScreen.setting('email-recipients')).toHaveCount(0);

    await publishScreen.continueButton().click();
    await publishScreen.confirmButton().click();

    await expect.poll(currentRoute).toBe('/posts');
    expect(submittedPost(saveApi)).toMatchObject({ status: 'published' });
    expect(saveApi.lastRequest?.url).not.toContain('newsletter=');
  });

  it.each(['submitted', 'failed'])(
    'leaves out a %s earlier send while member signup is off',
    async (emailStatus) => {
      publishChrome([WEEKLY]);
      fakeTiers([]);
      fakeLabels([]);
      fakeSavableDraft({
        email: { id: 'email-1', status: emailStatus, email_count: 20, opened_count: 0 },
      });
      await renderAdminApp(`/editor/post/${POST_ID}`, emailSite({ members_signup_access: 'none' }));

      await editorScreen.publishButton().click();
      await expect
        .element(publishScreen.setting('publish-type'))
        .toHaveTextContent('Publish on site');

      await expect(publishScreen.alreadySent()).toHaveCount(0);
    },
  );

  it('previews the web post, then the email for the post’s newsletter, and sends a test', async () => {
    publishChrome([WEEKLY, MONTHLY]);
    fakeTiers([]);
    fakeSavableDraft({
      newsletter: { id: MONTHLY.id, slug: MONTHLY.slug, name: MONTHLY.name, status: 'active' },
    });
    // Only the preview's renders carry a query; the email size check reads the bare path.
    const emailPreviewApi = fakeAdminEndpoint('GET', /^\/email_previews\/posts\/[^/]+\/\?/, {
      email_previews: [
        { subject: 'Hello from React', html: '<p>Email body</p>', plaintext: 'Email body' },
      ],
    });
    const testSendApi = fakeAdminEndpoint('POST', /^\/email_previews\/posts\//, null, {
      status: 204,
    });
    await renderAdminApp(`/editor/post/${POST_ID}`, emailSite());

    await editorScreen.previewButton().click();
    await expect
      .element(previewScreen.browserFrame())
      .toHaveAttribute('src', `${SITE_URL}/p/${POST_UUID}/?member_status=free`);

    await previewScreen.emailTab().click();
    await expect.element(previewScreen.emailFrame()).toBeVisible();
    await expect.element(previewScreen.newsletterSelect()).toHaveTextContent('Monthly roundup');
    await expect
      .poll(() => emailPreviewApi.lastRequest?.url)
      .toContain(`/email_previews/posts/${POST_ID}/`);
    expect(emailPreviewApi.lastRequest?.url).toContain('newsletter=monthly-roundup');

    await previewScreen.testEmailButton().click();
    await expect.element(previewScreen.testEmailInput()).toHaveValue(String(CURRENT_USER.email));
    await previewScreen.sendTestEmailButton().click();

    await expect
      .poll(() => testSendApi.lastRequest?.body)
      .toEqual({
        emails: [String(CURRENT_USER.email)],
        newsletter: 'monthly-roundup',
        member_status: 'free',
      });
  });

  it.each([
    ['on a self-hosted site', null, 'news@example.com'],
    ['with managed email', { enabled: true }, 'default@example.com'],
    [
      'with managed email and a sending domain',
      { enabled: true, sendingDomain: 'example.com' },
      'news@example.com',
    ],
    [
      'with managed email and a sender off the sending domain',
      { enabled: true, sendingDomain: 'example.org' },
      'default@example.com',
    ],
  ])(
    'previews the email from the address it is sent from %s',
    async (_site, managedEmail, from) => {
      publishChrome([
        newsletter({
          slug: 'weekly',
          name: 'Weekly',
          status: 'active',
          sender_email: 'news@example.com',
        }),
      ]);
      fakeTiers([]);
      fakeSavableDraft();
      const config = configResponse();
      if (managedEmail) {
        config.config.hostSettings = { managedEmail };
      }
      const site = emailSite();
      await renderAdminApp(`/editor/post/${POST_ID}`, {
        ...site,
        boot: { ...site.boot, browseConfig: { response: config } },
      });

      await editorScreen.previewButton().click();
      await previewScreen.emailTab().click();

      await expect.element(previewScreen.emailFrom()).toHaveTextContent(`Weekly <${from}>`);
    },
  );

  it('asks for the password when a test send finds the session expired, then sends it', async () => {
    publishChrome([WEEKLY]);
    fakeTiers([]);
    fakeSavableDraft();
    const expiredSendApi = fakeAdminEndpoint('POST', /^\/email_previews\/posts\//, SESSION_GONE, {
      status: 401,
    });
    const sessionApi = fakeAdminEndpoint('POST', '/session/', () => 'Created', { status: 201 });
    await renderAdminApp(`/editor/post/${POST_ID}`, emailSite());

    await sendTestFromPreview();

    await expect.element(editorScreen.reauthDialog()).toHaveTextContent('Are you still here?');
    expect(expiredSendApi.requests).toHaveLength(1);

    // Declared after the expired fake, so it answers the send held behind the sign-in.
    const testSendApi = fakeAdminEndpoint('POST', /^\/email_previews\/posts\//, null, {
      status: 204,
    });
    await editorScreen.reauthPassword().fill(PASSWORD);
    await editorScreen.reauthSignIn().click();

    await expect(editorScreen.reauthDialog()).toHaveCount(0);
    expect(sessionApi.lastRequest?.body).toEqual({
      username: String(CURRENT_USER.email),
      password: PASSWORD,
    });
    await expect.poll(() => testSendApi.requests.length).toBe(1);
    await expect
      .element(previewScreen.toastWithText(`Test email sent to ${String(CURRENT_USER.email)}`))
      .toBeVisible();
    await expect.element(previewScreen.modal()).toBeVisible();
    expect(currentRoute()).toBe(`/editor/post/${POST_ID}`);
  });

  it.each(['Cancel', 'Escape'])(
    'says the session expired beneath Send when the sign-in is abandoned with %s',
    async (abandonWith) => {
      publishChrome([WEEKLY]);
      fakeTiers([]);
      fakeSavableDraft();
      const testSendApi = fakeAdminEndpoint('POST', /^\/email_previews\/posts\//, SESSION_GONE, {
        status: 401,
      });
      await renderAdminApp(`/editor/post/${POST_ID}`, emailSite());

      await sendTestFromPreview();
      await expect.element(editorScreen.reauthDialog()).toBeVisible();
      if (abandonWith === 'Cancel') {
        await editorScreen.cancelReauth().click();
      } else {
        await userEvent.keyboard('{Escape}');
      }

      await expect(editorScreen.reauthDialog()).toHaveCount(0);
      await expect
        .element(previewScreen.testEmailError())
        .toHaveTextContent('Your session expired. Send again to sign in.');
      await expect.element(previewScreen.modal()).toBeVisible();

      // Sending again is the way back in.
      await previewScreen.sendTestEmailButton().click();

      await expect.element(editorScreen.reauthDialog()).toBeVisible();
      expect(testSendApi.requests).toHaveLength(2);
    },
  );

  it('asks for the password when the test popover closed while the expired send was out', async () => {
    publishChrome([WEEKLY]);
    fakeTiers([]);
    fakeSavableDraft();
    const answered = deferred<void>();
    fakeAdminEndpoint(
      'POST',
      /^\/email_previews\/posts\//,
      async () => {
        await answered.promise;
        return SESSION_GONE;
      },
      { status: 401 },
    );
    await renderAdminApp(`/editor/post/${POST_ID}`, emailSite());

    await sendTestFromPreview();
    await userEvent.keyboard('{Escape}');
    await expect(previewScreen.testEmailInput()).toHaveCount(0);
    answered.resolve();

    await expect.element(editorScreen.reauthDialog()).toHaveTextContent('Are you still here?');
  });
});
