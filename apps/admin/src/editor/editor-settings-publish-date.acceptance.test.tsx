import moment from 'moment-timezone';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { buildLexicalParagraph } from '@tryghost/test-data';

import {
  currentUserResponse,
  fakeAdminEndpoint,
  fakeMembers,
  fakeNewsletters,
  fakePosts,
  fakeSnippets,
  fakeTiers,
  post,
  renderAdminApp,
  settingsResponse,
  staffRole,
  unsavedChangesGuarded,
  type EndpointCapture,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';

const POST_ID = 'abc123';
const FLAG_ON = { labs: { editorReact: true } };
const LOADED_AT = '2026-01-01T00:00:00.000Z';
// 2025-12-01 10:00 UTC is 2025-12-01 21:00 in Sydney: a date the offset moves.
const PUBLISHED_AT = '2025-12-01T10:00:00.000Z';
const SYDNEY = 'Australia/Sydney';
const ROUTE = new RegExp(`^/posts/${POST_ID}/\\?`);

const SLOW = 20_000;
const POLL = { timeout: 10_000 };
const FIELD_POLL = { timeout: 2_000 };

type SavedPost = ReturnType<typeof post>;

function submittedPost(capture: EndpointCapture): Record<string, unknown> {
  const body = capture.lastRequest?.body as { posts: Record<string, unknown>[] } | undefined;
  return body?.posts[0] ?? {};
}

/**
 * A fixed-offset zone in which the current instant is around midday, so a later
 * hour on the same day is reliably still to come whenever this suite runs.
 */
function middayTimezone(): string {
  const offset = Math.max(-12, Math.min(14, 12 - new Date().getUTCHours()));
  return `Etc/GMT${offset >= 0 ? '-' : '+'}${Math.abs(offset)}`;
}

function withTimezone(timezone: string) {
  return {
    ...FLAG_ON,
    boot: {
      browseSettings: { response: settingsResponse({ settings: { timezone } }) },
    },
  };
}

function asContributor() {
  const me = currentUserResponse();
  me.users[0].roles = [staffRole({ name: 'Contributor' })];
  return { ...FLAG_ON, boot: { browseMe: { response: me } } };
}

function editorChrome() {
  fakeSnippets([]);
  fakePosts([]);
  fakeMembers([]);
  fakeNewsletters([]);
  fakeTiers([]);
  fakeAdminEndpoint('GET', /^\/slugs\/post\//, ({ url }) => ({
    slugs: [{ slug: decodeURIComponent(url.split('/slugs/post/')[1].split('/')[0]) }],
  }));
}

function fakeSavablePost(overrides: Partial<SavedPost> = {}) {
  editorChrome();
  let current = post({
    id: POST_ID,
    title: 'Hello from React',
    slug: 'hello-from-react',
    status: 'draft',
    lexical: buildLexicalParagraph('Hello from React'),
    updated_at: LOADED_AT,
    published_at: null,
    visibility: 'public',
    tiers: [],
    tags: [],
    ...overrides,
  });
  let saves = 0;

  fakeAdminEndpoint('GET', ROUTE, () => ({ posts: [current] }));

  return fakeAdminEndpoint('PUT', ROUTE, ({ body }) => {
    saves += 1;
    const submitted = (body as { posts: Partial<SavedPost>[] }).posts[0];
    current = { ...current, ...submitted, updated_at: `2026-01-01T00:00:0${saves}.000Z` };
    return { posts: [current] };
  });
}

async function openPublishDate() {
  await editorScreen.settingsToggle().click();
  await expect.element(editorScreen.settingsSidebar()).toBeVisible();
  await expect.element(editorScreen.settingsPublishDate()).toBeVisible();
}

async function setTime(value: string) {
  await editorScreen.settingsPublishTime().fill(value);
  // The field commits on blur, as the publish flow's does.
  await userEvent.tab();
}

/** The sidebar's Publish date section: when the post is published, in site time. */
describe('Post settings publish date', () => {
  it(
    'shows a published post’s publish time in the site’s timezone',
    async () => {
      fakeSavablePost({ status: 'published', published_at: PUBLISHED_AT });
      await renderAdminApp(`/editor/post/${POST_ID}`, withTimezone(SYDNEY));
      await openPublishDate();

      // 10:00 UTC is 21:00 the same day in Sydney, not 10:00.
      await expect.element(editorScreen.settingsPublishDate()).toHaveValue('2025-12-01');
      await expect.element(editorScreen.settingsPublishTime()).toHaveValue('21:00');
      await expect
        .element(editorScreen.settingsPublishDateLabel())
        .toHaveTextContent('Publish date');
    },
    SLOW,
  );

  it(
    'persists a draft’s publish time on its own, as a UTC instant',
    async () => {
      const saveApi = fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, withTimezone(SYDNEY));
      await openPublishDate();

      // A draft carries no publish time, so the field stands at today in site time.
      const chosen = (editorScreen.settingsPublishDate().element() as HTMLInputElement).value;

      await setTime('06:30');

      await expect.poll(() => saveApi.requests.length, FIELD_POLL).toBe(1);
      // 06:30 in Sydney is the same instant as the ISO string the payload carries.
      expect(submittedPost(saveApi)).toMatchObject({
        published_at: moment.tz(`${chosen} 06:30`, SYDNEY).toISOString(),
        status: 'draft',
      });
      await expect.element(editorScreen.settingsPublishTime()).toHaveValue('06:30');
    },
    SLOW,
  );

  it(
    'stages a published post’s backdate until Update',
    async () => {
      const saveApi = fakeSavablePost({ status: 'published', published_at: PUBLISHED_AT });
      await renderAdminApp(`/editor/post/${POST_ID}`, withTimezone(SYDNEY));
      await openPublishDate();

      await expect.element(editorScreen.updateButton()).toBeDisabled();

      await setTime('08:15');

      await expect.element(editorScreen.updateButton()).toBeEnabled();
      await expect.poll(unsavedChangesGuarded).toBe(true);
      expect(saveApi.requests).toHaveLength(0);

      await userEvent.keyboard('{Meta>}s{/Meta}');

      await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
      expect(submittedPost(saveApi)).toMatchObject({
        published_at: moment.tz('2025-12-01 08:15', SYDNEY).toISOString(),
        status: 'published',
      });
      await expect.element(editorScreen.updateButton()).toBeDisabled();
    },
    SLOW,
  );

  it(
    'refuses a published post a publish time that has not passed',
    async () => {
      const timezone = middayTimezone();
      // Published an hour ago, so the field already shows today in that zone.
      const anHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const saveApi = fakeSavablePost({ status: 'published', published_at: anHourAgo });
      await renderAdminApp(`/editor/post/${POST_ID}`, withTimezone(timezone));
      await openPublishDate();

      await expect
        .element(editorScreen.settingsPublishDate())
        .toHaveValue(moment.tz(timezone).format('YYYY-MM-DD'));

      // The same day, but an hour still to come.
      await setTime('23:59');

      await expect
        .element(editorScreen.settingsPublishDateError())
        .toHaveTextContent('Please choose a past date and time.');
      await expect.element(editorScreen.settingsPublishTime()).toHaveAttribute('aria-invalid');
      expect(saveApi.requests).toHaveLength(0);

      await userEvent.keyboard('{Meta>}s{/Meta}');

      await expect
        .element(editorScreen.saveErrorBanner())
        .toHaveTextContent('Please choose a past date and time.');
      expect(saveApi.requests).toHaveLength(0);
    },
    SLOW,
  );

  it(
    'sends a scheduled post to the publish menu to be re-timed',
    async () => {
      const scheduledAt = moment().add(2, 'days').toISOString();
      fakeSavablePost({ status: 'scheduled', published_at: scheduledAt });
      await renderAdminApp(`/editor/post/${POST_ID}`, withTimezone(SYDNEY));
      await openPublishDate();

      await expect
        .element(editorScreen.settingsPublishDateLabel())
        .toHaveTextContent('Scheduled date');
      await expect.element(editorScreen.settingsPublishDate()).toBeDisabled();
      await expect.element(editorScreen.settingsPublishTime()).toBeDisabled();
      await expect
        .element(editorScreen.settingsPublishDateNote())
        .toHaveTextContent('Use the publish menu to re-schedule');
    },
    SLOW,
  );

  it(
    'lets a sent post be re-timed, as every other published one is',
    async () => {
      const saveApi = fakeSavablePost({ status: 'sent', published_at: PUBLISHED_AT });
      await renderAdminApp(`/editor/post/${POST_ID}`, withTimezone(SYDNEY));
      await openPublishDate();

      await expect.element(editorScreen.settingsPublishDate()).not.toBeDisabled();
      await expect(editorScreen.settingsPublishDateNote()).toHaveCount(0);

      await setTime('07:45');

      // A sent post stages like a published one, so nothing is sent until Update.
      expect(saveApi.requests).toHaveLength(0);
      await userEvent.keyboard('{Meta>}s{/Meta}');

      await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
      expect(submittedPost(saveApi)).toMatchObject({
        published_at: moment.tz('2025-12-01 07:45', SYDNEY).toISOString(),
        status: 'sent',
      });
    },
    SLOW,
  );

  it(
    'offers the publish date to a role that cannot set the other fields',
    async () => {
      fakeSavablePost({ authors: [{ id: '1' }] });
      await renderAdminApp(`/editor/post/${POST_ID}`, asContributor());
      await editorScreen.settingsToggle().click();
      await expect.element(editorScreen.settingsSidebar()).toBeVisible();

      // Access is an Owner/Administrator/Editor field; the publish date is not.
      await expect(editorScreen.settingsVisibility()).toHaveCount(0);
      await expect.element(editorScreen.settingsPublishDate()).toBeVisible();
      await expect.element(editorScreen.settingsPublishDate()).not.toBeDisabled();
    },
    SLOW,
  );
});
