import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { buildLexicalParagraph } from '@tryghost/test-data';

import {
  currentUserResponse,
  fakeAdminEndpoint,
  fakeEmailPreview,
  fakeLabels,
  fakeNewsletters,
  fakePages,
  fakePosts,
  fakePostsListScreen,
  fakeSnippets,
  fakeTiers,
  newsletter,
  post,
  renderAdminApp,
  settingsResponse,
  withoutAutosave,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';
import { previewScreen } from '@/editor/preview/preview.screen';
import { readDraftNewsletter, writeDraftNewsletter } from '@/editor/publish/draft-newsletter';
import { publishScreen } from '@/editor/publish/publish.screen';

const POST_ID = 'abc123';
const CURRENT_USER = currentUserResponse().users[0];

const WEEKLY = newsletter({ slug: 'weekly', name: 'Weekly', status: 'active', sort_order: 0 });
const MONTHLY = newsletter({
  slug: 'monthly-roundup',
  name: 'Monthly roundup',
  status: 'active',
  sort_order: 1,
});
const DAILY = newsletter({
  slug: 'daily-brief',
  name: 'Daily brief',
  status: 'active',
  sort_order: 2,
});

/** A draft on a site that can send it to three newsletters; saves echo back. */
function fakeEmailDraft() {
  fakeSnippets([]);
  fakePosts([]);
  fakePages([]);
  fakePostsListScreen();
  fakeTiers([]);
  fakeLabels([]);
  fakeEmailPreview();
  fakeNewsletters([WEEKLY, MONTHLY, DAILY]);
  fakeAdminEndpoint('GET', /^\/members\/\?.*order=id/, {
    members: [],
    meta: { pagination: { page: 1, limit: 1, pages: 1, total: 20, next: null, prev: null } },
  });
  let current: Record<string, unknown> = {
    ...post({
      id: POST_ID,
      title: 'Hello from React',
      status: 'draft',
      lexical: buildLexicalParagraph('Hello from React'),
      published_at: null,
      tags: [],
      authors: [{ id: String(CURRENT_USER.id) }],
    }),
  };
  fakeAdminEndpoint('GET', new RegExp(`^/posts/${POST_ID}/\\?`), () => ({ posts: [current] }));
  return fakeAdminEndpoint('PUT', new RegExp(`^/posts/${POST_ID}/\\?`), ({ body }) => {
    current = { ...current, ...(body as { posts: Record<string, unknown>[] }).posts[0] };
    return { posts: [current] };
  });
}

function editorOptions() {
  return {
    ...withoutAutosave(),
    boot: {
      browseSettings: {
        response: settingsResponse({
          settings: {
            mailgun_domain: 'mail.test.com',
            mailgun_api_key: 'key',
            mailgun_base_url: 'https://api.mailgun.net/v3',
          },
        }),
      },
    },
  };
}

async function openFlowNewsletters() {
  await expect.element(editorScreen.publishButton()).toBeEnabled();
  await editorScreen.publishButton().click();
  await publishScreen.setting('email-recipients').click();
}

async function pickPreviewNewsletter(name: string) {
  await previewScreen.emailTab().click();
  await previewScreen.newsletterSelect().click();
  await previewScreen.option(name).click();
  await expect.element(previewScreen.newsletterSelect()).toHaveTextContent(name);
}

afterEach(() => {
  localStorage.removeItem('ghost-last-published-post');
});

describe('Remembered draft newsletter', () => {
  it('remembers the newsletter picked in the publish flow for the draft', async () => {
    fakeEmailDraft();
    await renderAdminApp(`/editor/post/${POST_ID}`, editorOptions());
    await openFlowNewsletters();
    await publishScreen.newsletterSelect().click();
    await page.getByRole('option', { name: /^Monthly roundup/ }).click();
    await publishScreen.closeButton().click();

    // Kept even though the flow closed without publishing.
    expect(readDraftNewsletter(localStorage, POST_ID)).toBe('monthly-roundup');
    await openFlowNewsletters();
    await expect.element(publishScreen.newsletterSelect()).toHaveTextContent('Monthly roundup');
  });

  it('opens a draft on its remembered newsletter, and forgets it once sent', async () => {
    // As left by an earlier visit, so this one reads it from storage.
    writeDraftNewsletter(localStorage, POST_ID, 'monthly-roundup');
    const saveApi = fakeEmailDraft();
    await renderAdminApp(`/editor/post/${POST_ID}`, editorOptions());
    await openFlowNewsletters();
    await expect.element(publishScreen.newsletterSelect()).toHaveTextContent('Monthly roundup');

    await publishScreen.continueButton().click();
    await publishScreen.confirmButton().click();
    await expect.poll(() => saveApi.lastRequest?.url).toContain('newsletter=monthly-roundup');
    await expect.poll(() => readDraftNewsletter(localStorage, POST_ID)).toBeNull();
  });

  it('opens the publish flow on the newsletter picked in the preview', async () => {
    fakeEmailDraft();
    await renderAdminApp(`/editor/post/${POST_ID}`, editorOptions());
    await expect.element(editorScreen.publishButton()).toBeEnabled();
    await editorScreen.previewButton().click();
    await pickPreviewNewsletter('Daily brief');
    await previewScreen.publishButton().click();

    await publishScreen.setting('email-recipients').click();
    await expect.element(publishScreen.newsletterSelect()).toHaveTextContent('Daily brief');
  });

  it('switches the open flow to a newsletter picked in the preview over it', async () => {
    fakeEmailDraft();
    await renderAdminApp(`/editor/post/${POST_ID}`, editorOptions());
    await openFlowNewsletters();
    await expect.element(publishScreen.newsletterSelect()).toHaveTextContent('Weekly');
    await publishScreen.previewButton().click();
    await pickPreviewNewsletter('Monthly roundup');
    await previewScreen.publishButton().click();

    await expect.element(publishScreen.newsletterSelect()).toHaveTextContent('Monthly roundup');
  });
});
