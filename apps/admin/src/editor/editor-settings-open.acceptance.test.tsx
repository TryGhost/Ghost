import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import {
  fakeAdminEndpoint,
  fakeEditorChrome,
  fakeEditorPost,
  renderAdminApp,
  settleTransitions,
  withoutAutosave,
} from '@test-utils/acceptance';
import { SETTINGS_OPEN_KEY } from '@/editor/settings-open';
import { editorScreen } from '@/editor/editor.screen';

const ROUTE = '/editor/post/abc123';
// The suite's own viewport, restored after the case that narrows it.
const WIDE_VIEWPORT = { width: 1280, height: 800 };
/** The editor's own parts that move with the settings panel. */
const SETTINGS_MOTION = '[class*="editor-settings-motion-"]';

function fakeDraft(overrides: Parameters<typeof fakeEditorPost>[0] = {}) {
  fakeEditorChrome();
  fakeAdminEndpoint('GET', /^\/slugs\/post\//, ({ url }) => ({
    slugs: [{ slug: decodeURIComponent(url.split('/slugs/post/')[1].split('/')[0]) }],
  }));
  return fakeEditorPost({ tags: [], meta_title: null, ...overrides });
}

function editorOptions({ flag = true }: { flag?: boolean } = {}) {
  return { ...withoutAutosave(), labs: { admin7EditorImprovements: flag } };
}

/** Leaves the editor for another screen and opens the post again. */
async function reopenEditor() {
  window.location.hash = '#/restore';
  await expect(editorScreen.body()).toHaveCount(0);
  window.location.hash = `#${ROUTE}`;
  await expect.element(editorScreen.body()).toBeVisible();
}

async function pressSettingsShortcut() {
  await userEvent.keyboard('{Meta>}.{/Meta}');
  await settleTransitions();
}

async function toggleSettings() {
  await editorScreen.settingsToggle().click();
  await settleTransitions();
}

function settingsTransitions() {
  return document.getAnimations().filter((animation) => {
    const target = (animation.effect as KeyframeEffect | null)?.target;
    return animation instanceof CSSTransition && !!target?.matches(SETTINGS_MOTION);
  });
}

const stored = () => localStorage.getItem(SETTINGS_OPEN_KEY);

afterEach(async () => {
  await page.viewport(WIDE_VIEWPORT.width, WIDE_VIEWPORT.height);
});

describe('Remembered settings panel (admin7EditorImprovements)', () => {
  it('opens the editor with the panel as the writer last left it', async () => {
    fakeDraft();
    await renderAdminApp(ROUTE, editorOptions());
    await expect.element(editorScreen.body()).toBeVisible();
    await expect(editorScreen.settingsSidebar()).toHaveCount(0);

    await toggleSettings();
    expect(stored()).toBe('open');

    await reopenEditor();
    // Already in place, rather than sliding in as a toggle opens it.
    await expect.element(editorScreen.settingsSidebar()).toBeVisible();
    expect(settingsTransitions()).toHaveLength(0);
    await expect.element(editorScreen.settingsToggle()).toHaveAttribute('aria-expanded', 'true');

    await toggleSettings();
    await expect(editorScreen.settingsSidebar()).toHaveCount(0);
    expect(stored()).toBe('closed');

    await reopenEditor();
    await expect(editorScreen.settingsSidebar()).toHaveCount(0);
    await expect.element(editorScreen.settingsToggle()).toHaveAttribute('aria-expanded', 'false');
  });

  it('starts closed where the panel covers the editor, and forgets toggles there', async () => {
    fakeDraft();
    localStorage.setItem(SETTINGS_OPEN_KEY, 'open');
    await page.viewport(900, 800);
    await renderAdminApp(ROUTE, editorOptions());
    await expect.element(editorScreen.body()).toBeVisible();
    await expect(editorScreen.settingsSidebar()).toHaveCount(0);

    await toggleSettings();
    await expect.element(editorScreen.settingsSidebar()).toBeVisible();
    await toggleSettings();
    await expect(editorScreen.settingsSidebar()).toHaveCount(0);

    expect(stored()).toBe('open');
  });

  it('opens and closes the panel with Cmd-., leaving the writer typing', async () => {
    fakeDraft();
    await renderAdminApp(ROUTE, editorOptions());
    await editorScreen.titleInput().click();

    await pressSettingsShortcut();
    await expect.element(editorScreen.settingsSidebar()).toBeVisible();
    await expect.element(editorScreen.titleInput()).toHaveFocus();
    expect(stored()).toBe('open');

    await pressSettingsShortcut();
    await expect(editorScreen.settingsSidebar()).toHaveCount(0);
    await expect.element(editorScreen.titleInput()).toHaveFocus();
    expect(stored()).toBe('closed');
  });

  it('does not remember the panel the editor opens to show a refused field', async () => {
    fakeDraft({ meta_title: 'a'.repeat(301) });
    // The site's member total, which the publish inputs read before Publish is offered.
    fakeAdminEndpoint('GET', /^\/members\/\?.*order=id/, {
      members: [],
      meta: { pagination: { page: 1, limit: 1, pages: 1, total: 20, next: null, prev: null } },
    });
    await renderAdminApp(ROUTE, editorOptions());
    await expect.element(editorScreen.publishButton()).toBeEnabled();

    await editorScreen.publishButton().click();

    await expect.element(editorScreen.settingsMetaTitle()).toHaveFocus();
    expect(stored()).toBeNull();
  });

  it('ignores and keeps the remembered state with the flag off', async () => {
    fakeDraft();
    localStorage.setItem(SETTINGS_OPEN_KEY, 'open');
    await renderAdminApp(ROUTE, editorOptions({ flag: false }));
    await expect.element(editorScreen.body()).toBeVisible();
    await expect(editorScreen.settingsSidebar()).toHaveCount(0);

    await pressSettingsShortcut();
    await expect(editorScreen.settingsSidebar()).toHaveCount(0);

    await toggleSettings();
    await expect.element(editorScreen.settingsSidebar()).toBeVisible();
    await toggleSettings();
    await expect(editorScreen.settingsSidebar()).toHaveCount(0);

    expect(stored()).toBe('open');
  });
});
