import moment from 'moment-timezone';
import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import {
  currentUserResponse,
  fakeAdminEndpoint,
  fakeEditorChrome,
  fakeEditorPost,
  fakeTiers,
  post,
  renderAdminApp,
  settingsResponse,
  staffRole,
  submittedPost,
  unsavedChangesGuarded,
  withoutAutosave,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';

const POST_ID = 'abc123';
const LOADED_AT = '2026-01-01T00:00:00.000Z';
const FLAG_ON = withoutAutosave({ labs: { editorReact: true } });
// 2025-12-01 10:00 UTC is 2025-12-01 21:00 in Sydney: a date the offset moves.
const PUBLISHED_AT = '2025-12-01T10:00:00.000Z';
// What a real publish stamps: seconds the minute-granular fields cannot show.
const STAMPED_AT = '2025-12-01T10:00:37.000Z';
const SYDNEY = 'Australia/Sydney';

const POLL = { timeout: 10_000 };

type SavedPost = ReturnType<typeof post>;

/**
 * A fixed-offset zone in which the current instant is around midday, so a later
 * hour on the same day is reliably still to come whenever this suite runs.
 */
function middayTimezone(): string {
  const offset = Math.max(-12, Math.min(14, 12 - new Date().getUTCHours()));
  return `Etc/GMT${offset >= 0 ? '-' : '+'}${Math.abs(offset)}`;
}

// The settings groups the editor's settings hook asks for, which every editor
// reader shares; a narrower list would drop keys another surface reads.
const SETTINGS_GROUPS =
  'site,theme,private,members,portal,newsletter,email,labs,slack,unsplash,views,firstpromoter,editor,comments,analytics,announcement,pintura,donations,security,social_web,explore,transistor';

let settingsRequestUrl: string | null = null;

function withTimezone(timezone: string) {
  settingsRequestUrl = null;
  return {
    ...FLAG_ON,
    boot: {
      browseSettings: {
        response: (request: Request) => {
          settingsRequestUrl = request.url;
          return settingsResponse({ settings: { timezone } });
        },
      },
    },
  };
}

function asContributor() {
  const me = currentUserResponse();
  me.users[0].roles = [staffRole({ name: 'Contributor' })];
  return { ...FLAG_ON, boot: { browseMe: { response: me } } };
}

function editorChrome() {
  fakeEditorChrome();
  fakeTiers([]);
  fakeAdminEndpoint('GET', /^\/slugs\/post\//, ({ url }) => ({
    slugs: [{ slug: decodeURIComponent(url.split('/slugs/post/')[1].split('/')[0]) }],
  }));
}

function fakeSavablePost(overrides: Partial<SavedPost> = {}) {
  editorChrome();
  return fakeEditorPost({
    visibility: 'public',
    tiers: [],
    tags: [],
    ...overrides,
  });
}

async function openPublishDate() {
  await editorScreen.settingsToggle().click();
  await expect.element(editorScreen.settingsSidebar()).toBeVisible();
  await expect.element(editorScreen.settingsPublishDate()).toBeVisible();
}

async function leaveTimeField() {
  // Native time controls tab through their hour/minute (and locale-specific period)
  // segments before leaving the input. A save commits when the whole field blurs.
  for (
    let segment = 0;
    segment < 4 && document.activeElement === editorScreen.settingsPublishTime().element();
    segment++
  ) {
    await userEvent.tab();
  }
  expect(document.activeElement).not.toBe(editorScreen.settingsPublishTime().element());
}

async function setTime(value: string) {
  await editorScreen.settingsPublishTime().fill(value);
  // The field commits on blur, as the publish flow's does.
  await leaveTimeField();
}

async function typeDate(value: string) {
  await editorScreen.settingsPublishDate().fill(value);
  await userEvent.tab();
}

/** The sidebar's Publish date section: when the post is published, in site time. */
describe('Post settings publish date', () => {
  it.each(['untouched time', 'retyped time', 'reselected day'] as const)(
    'leaves a draft’s publish time unset with an unchanged picker (%s)',
    async (interaction) => {
      const saveApi = fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, withTimezone(SYDNEY));
      await openPublishDate();

      if (interaction === 'reselected day') {
        await editorScreen.settingsPublishDate().click();
        await page.getByRole('gridcell', { selected: true }).click();
        await userEvent.keyboard('{Escape}');
      } else {
        await editorScreen.settingsPublishTime().click();
        if (interaction === 'retyped time') {
          const displayed = (editorScreen.settingsPublishTime().element() as HTMLInputElement)
            .value;
          await editorScreen.settingsPublishTime().fill('');
          await editorScreen.settingsPublishTime().fill(displayed);
        }
        await userEvent.tab();
      }

      // Save another field to observe the date carried by the session.
      await editorScreen.titleInput().fill('Changed title');
      await userEvent.keyboard('{Meta>}s{/Meta}');
      await expect.poll(() => submittedPost(saveApi).title, POLL).toBe('Changed title');
      expect(submittedPost(saveApi).published_at).toBeNull();
    },
  );

  it('shows a published post’s publish time in the site’s timezone', async () => {
    fakeSavablePost({ status: 'published', published_at: PUBLISHED_AT });
    await renderAdminApp(`/editor/post/${POST_ID}`, withTimezone(SYDNEY));
    await openPublishDate();

    // 10:00 UTC is 21:00 the same day in Sydney, not 10:00.
    await expect.element(editorScreen.settingsPublishDate()).toHaveValue('2025-12-01');
    await expect.element(editorScreen.settingsPublishTime()).toHaveValue('21:00');
    await expect.element(editorScreen.settingsPublishDateLabel()).toHaveTextContent('Publish date');
    expect(new URL(settingsRequestUrl ?? '', 'http://localhost').searchParams.get('group')).toBe(
      SETTINGS_GROUPS,
    );
  });

  it('persists a draft’s publish time on its own, as a UTC instant', async () => {
    const timezone = middayTimezone();
    const saveApi = fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, withTimezone(timezone));
    await openPublishDate();

    // A draft carries no publish time, so the field stands at today in site time.
    // With the clock around midday, midnight is always a different, past time.
    const chosen = (editorScreen.settingsPublishDate().element() as HTMLInputElement).value;

    await setTime('00:00');

    // Site-local midnight is the same instant as the ISO string the payload carries.
    await expect(saveApi).toHaveSavedFields({
      published_at: moment.tz(`${chosen} 00:00`, timezone).toISOString(),
      status: 'draft',
    });
    await expect.element(editorScreen.settingsPublishTime()).toHaveValue('00:00');
  });

  it('leaves the seconds a publish stamped alone while the minute stands', async () => {
    const saveApi = fakeSavablePost({ status: 'published', published_at: STAMPED_AT });
    await renderAdminApp(`/editor/post/${POST_ID}`, withTimezone(SYDNEY));
    await openPublishDate();

    await expect.element(editorScreen.settingsPublishTime()).toHaveValue('21:00');

    // Tabbing through the field, or retyping the minute it shows, leaves the stored timestamp alone.
    await editorScreen.settingsPublishTime().click();
    await leaveTimeField();
    await setTime('21:00');
    await expect.element(editorScreen.updateButton()).toBeDisabled();
    expect(unsavedChangesGuarded()).toBe(false);

    // So the first write the field makes is the next minute the writer picks.
    await setTime('21:05');

    await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
    expect(submittedPost(saveApi).published_at).toBe('2025-12-01T10:05:00.000Z');
  });

  it('saves a published post’s backdate on its own', async () => {
    const saveApi = fakeSavablePost({ status: 'published', published_at: PUBLISHED_AT });
    await renderAdminApp(`/editor/post/${POST_ID}`, withTimezone(SYDNEY));
    await openPublishDate();

    await setTime('08:15');

    await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
    expect(submittedPost(saveApi)).toMatchObject({
      id: POST_ID,
      updated_at: LOADED_AT,
      published_at: moment.tz('2025-12-01 08:15', SYDNEY).toISOString(),
    });
    await expect.element(editorScreen.updateButton()).toBeDisabled();
  });

  it('refuses a published post a publish time that has not passed', async () => {
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

    // The banner outlives the panel: closing it does not hide the reason.
    await editorScreen.settingsToggle().click();
    await expect(editorScreen.settingsPublishDateError()).toHaveCount(0);
    await expect
      .element(editorScreen.saveErrorBanner())
      .toHaveTextContent('Please choose a past date and time.');
  });

  it('saves a typed date, however far back, once the field is left', async () => {
    const saveApi = fakeSavablePost({ status: 'published', published_at: PUBLISHED_AT });
    await renderAdminApp(`/editor/post/${POST_ID}`, withTimezone(SYDNEY));
    await openPublishDate();

    // A click opens the calendar by the caret; clicking back into the field leaves it as it was.
    await editorScreen.settingsPublishDate().click();
    await expect.element(page.getByRole('grid', { name: 'December 2025' })).toBeVisible();
    await page.getByRole('button', { name: 'Go to the Previous Month' }).click();
    await editorScreen.settingsPublishDate().click();
    await expect.element(page.getByRole('grid', { name: 'November 2025' })).toBeVisible();

    // Typing closes it and leaves the field focused; nothing is saved until the field is left.
    await userEvent.keyboard(`${'{Backspace}'.repeat(10)}${'{Delete}'.repeat(10)}`);
    await expect(page.getByRole('grid')).toHaveCount(0);
    await userEvent.keyboard('2015-03-14');
    expect(saveApi.requests).toHaveLength(0);
    await userEvent.tab();

    await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
    expect(submittedPost(saveApi).published_at).toBe(
      moment.tz('2015-03-14 21:00', SYDNEY).toISOString(),
    );

    // The calendar reopens on the typed month.
    await editorScreen.settingsPublishDate().click();
    await expect.element(page.getByRole('grid', { name: 'March 2015' })).toBeVisible();
  });

  it('opens the calendar from its button and picks a day from the keyboard', async () => {
    const saveApi = fakeSavablePost({ status: 'published', published_at: PUBLISHED_AT });
    await renderAdminApp(`/editor/post/${POST_ID}`, withTimezone(SYDNEY));
    await openPublishDate();

    const calendarButton = editorScreen.settingsPublishDateCalendarButton();
    const selectedDay = () => page.getByRole('gridcell', { selected: true }).getByRole('button');
    // The popup is the button's: the field announces none.
    await expect.element(editorScreen.settingsPublishDate()).not.toHaveAttribute('aria-expanded');

    await editorScreen.settingsSlug().click();
    await userEvent.tab();
    await expect.element(calendarButton).toHaveFocus();

    // Escape closes it without a change and hands focus back.
    await userEvent.keyboard('{Enter}');
    await expect.element(selectedDay()).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await expect(page.getByRole('grid')).toHaveCount(0);
    await expect.element(calendarButton).toHaveFocus();

    await userEvent.keyboard('{Enter}');
    await expect.element(selectedDay()).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}{Enter}');

    await expect(page.getByRole('grid')).toHaveCount(0);
    await expect.element(calendarButton).toHaveFocus();
    await expect.element(editorScreen.settingsPublishDate()).toHaveValue('2025-12-03');
    await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
    expect(submittedPost(saveApi).published_at).toBe(
      moment.tz('2025-12-03 21:00', SYDNEY).toISOString(),
    );
  });

  it('moves a held time that the typed day skips for daylight saving to the hour after', async () => {
    // 02:30 in Sydney, which the clocks jump past on 5 October 2025.
    const saveApi = fakeSavablePost({
      status: 'published',
      published_at: moment.tz('2025-10-03 02:30', SYDNEY).toISOString(),
    });
    await renderAdminApp(`/editor/post/${POST_ID}`, withTimezone(SYDNEY));
    await openPublishDate();

    await typeDate('2025-10-05');

    await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
    expect(submittedPost(saveApi).published_at).toBe(
      moment.tz('2025-10-05 03:30', SYDNEY).toISOString(),
    );
    await expect.element(editorScreen.settingsPublishTime()).toHaveValue('03:30');
  });

  it.each([
    ['2025-11-31', 'Invalid date'],
    ['01/12/2025', 'Invalid date format, must be YYYY-MM-DD'],
  ])('refuses %s as a typed date until it is corrected or discarded', async (typed, message) => {
    const saveApi = fakeSavablePost({ status: 'published', published_at: PUBLISHED_AT });
    await renderAdminApp(`/editor/post/${POST_ID}`, withTimezone(SYDNEY));
    await openPublishDate();

    await typeDate(typed);

    await expect.element(editorScreen.settingsPublishDate()).toHaveValue(typed);
    await expect
      .element(editorScreen.settingsPublishDate())
      .toHaveAttribute('aria-invalid', 'true');
    await expect.element(editorScreen.settingsPublishDate()).toHaveAccessibleDescription(message);
    await expect.element(editorScreen.updateButton()).toBeDisabled();

    // Escape in the field puts the held date back.
    await userEvent.tab({ shift: true });
    await userEvent.keyboard('{Escape}');

    await expect.element(editorScreen.settingsPublishDate()).toHaveValue('2025-12-01');
    await expect
      .element(editorScreen.settingsPublishDate())
      .not.toHaveAttribute('aria-invalid', 'true');
    await expect.element(editorScreen.settingsPublishDate()).not.toHaveAccessibleDescription();
    expect(unsavedChangesGuarded()).toBe(false);
    expect(saveApi.requests).toHaveLength(0);
  });

  it('keeps Cmd-S from saving past a refused date', async () => {
    const saveApi = fakeSavablePost({ status: 'published', published_at: PUBLISHED_AT });
    await renderAdminApp(`/editor/post/${POST_ID}`, withTimezone(SYDNEY));
    await openPublishDate();

    // A published post's title waits for an explicit save, which Cmd-S would send.
    await editorScreen.titleInput().fill('Changed title');
    await editorScreen.settingsPublishDate().fill('2025-11-31');
    await userEvent.keyboard('{Meta>}s{/Meta}');

    await expect
      .element(editorScreen.settingsPublishDate())
      .toHaveAccessibleDescription('Invalid date');
    expect(saveApi.requests).toHaveLength(0);

    // The corrected date saves on Enter, alone: the title still waits for Update.
    await editorScreen.settingsPublishDate().fill('2025-11-30');
    await userEvent.keyboard('{Enter}');

    await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
    expect(submittedPost(saveApi).published_at).toBe(
      moment.tz('2025-11-30 21:00', SYDNEY).toISOString(),
    );
    expect(submittedPost(saveApi).title).not.toBe('Changed title');
    await expect.element(editorScreen.updateButton()).toBeEnabled();
  });

  it('holds a typed date still to come to the past-date rule', async () => {
    const saveApi = fakeSavablePost({ status: 'published', published_at: PUBLISHED_AT });
    await renderAdminApp(`/editor/post/${POST_ID}`, withTimezone(SYDNEY));
    await openPublishDate();

    // The calendar stops at today, so only typing reaches a later day.
    await typeDate(moment.tz(SYDNEY).add(1, 'year').format('YYYY-MM-DD'));

    await expect
      .element(editorScreen.settingsPublishDateError())
      .toHaveTextContent('Please choose a past date and time.');
    await expect.poll(unsavedChangesGuarded).toBe(true);
    expect(saveApi.requests).toHaveLength(0);
  });

  it('sends a scheduled post to the publish menu to be re-timed', async () => {
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
  });

  it('lets a sent post be re-timed, as every other published one is', async () => {
    const saveApi = fakeSavablePost({ status: 'sent', published_at: PUBLISHED_AT });
    await renderAdminApp(`/editor/post/${POST_ID}`, withTimezone(SYDNEY));
    await openPublishDate();

    await expect.element(editorScreen.settingsPublishDate()).not.toBeDisabled();
    await expect(editorScreen.settingsPublishDateNote()).toHaveCount(0);

    await setTime('07:45');

    await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
    expect(submittedPost(saveApi)).toMatchObject({
      id: POST_ID,
      updated_at: LOADED_AT,
      published_at: moment.tz('2025-12-01 07:45', SYDNEY).toISOString(),
    });
  });

  it('offers the publish date to a role that cannot set the other fields', async () => {
    fakeSavablePost({ authors: [{ id: '1' }] });
    await renderAdminApp(`/editor/post/${POST_ID}`, asContributor());
    await editorScreen.settingsToggle().click();
    await expect.element(editorScreen.settingsSidebar()).toBeVisible();

    // Access is an Owner/Administrator/Editor field; the publish date is not.
    await expect(editorScreen.settingsVisibility()).toHaveCount(0);
    await expect.element(editorScreen.settingsPublishDate()).toBeVisible();
    await expect.element(editorScreen.settingsPublishDate()).not.toBeDisabled();
  });
});
