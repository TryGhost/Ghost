import { describe, expect, it, onTestFinished } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { buildLexicalParagraph } from '@tryghost/test-data';

import {
  currentUserResponse,
  fakeAdminEndpoint,
  fakeEditorChrome,
  fakeTiers,
  post,
  renderAdminApp,
  staffRole,
  type StaffRoleName,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';

const POST_ID = 'abc123';
const CURRENT_USER_ID = '1';
const FLAG_ON = { labs: { editorReact: true } };
const ROUTE = new RegExp(`^/posts/${POST_ID}/\\?`);
const BACK_LABEL = 'Close keyboard shortcuts panel';
const ROW_LABEL = 'Keyboard shortcuts';
const MAC_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const WINDOWS_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// A full-app render outlasts the default timeout.
const SLOW = 20_000;

/** The pane reads the platform as it renders, so the agent has to be in place first. */
function onPlatform(userAgent: string) {
  Object.defineProperty(navigator, 'userAgent', { configurable: true, get: () => userAgent });
  onTestFinished(() => {
    Reflect.deleteProperty(navigator, 'userAgent');
  });
}

function asRole(name: StaffRoleName) {
  const me = currentUserResponse();
  me.users[0].roles = [staffRole({ name })];
  return { ...FLAG_ON, boot: { browseMe: { response: me } } };
}

function fakeEditablePost(overrides: Partial<ReturnType<typeof post>> = {}) {
  fakeEditorChrome();
  fakeTiers([]);
  fakeAdminEndpoint('GET', /^\/slugs\/post\//, ({ url }) => ({
    slugs: [{ slug: decodeURIComponent(url.split('/slugs/post/')[1].split('/')[0]) }],
  }));

  const current = post({
    id: POST_ID,
    title: 'Hello from React',
    slug: 'hello-from-react',
    status: 'draft',
    lexical: buildLexicalParagraph('Hello from React'),
    tags: [],
    ...overrides,
  });

  fakeAdminEndpoint('GET', ROUTE, () => ({ posts: [current] }));
  fakeAdminEndpoint('PUT', ROUTE, () => ({ posts: [current] }));
}

async function openShortcuts() {
  await editorScreen.settingsToggle().click();
  await expect.element(editorScreen.settingsSidebar()).toBeVisible();
  await editorScreen.settingsSubviewRow(ROW_LABEL).click();
  await expect.element(editorScreen.settingsSubviewPane()).toBeVisible();
}

/**
 * The sidebar's Keyboard shortcuts pane: the reference list of every chord and
 * slash command the editor answers to, in the writer's own platform glyphs.
 */
describe('Post settings keyboard shortcuts', () => {
  it(
    'opens the pane over the section list and comes back from it',
    async () => {
      fakeEditablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openShortcuts();

      // The pane replaces the list it was opened from.
      await expect(editorScreen.settingsExcerpt()).toHaveCount(0);
      await expect.element(editorScreen.settingsSidebar()).toHaveAttribute('aria-label', ROW_LABEL);
      await expect.element(page.getByRole('heading', { level: 2, name: ROW_LABEL })).toBeVisible();

      await editorScreen.settingsSubviewBack(BACK_LABEL).click();

      await expect(editorScreen.settingsSubviewPane()).toHaveCount(0);
      await expect.element(editorScreen.settingsExcerpt()).toBeVisible();
      await expect.element(editorScreen.settingsSubviewRow(ROW_LABEL)).toBeVisible();
    },
    SLOW,
  );

  it(
    'lists every shortcut under the group it belongs to, without widening the panel',
    async () => {
      fakeEditablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openShortcuts();

      const pane = editorScreen.settingsSubviewPane();
      await expect.element(pane).toHaveTextContent('Formatting');
      await expect.element(pane).toHaveTextContent('Editing');
      await expect.element(pane).toHaveTextContent('Application');
      await expect.element(pane).toHaveTextContent('Inserting');

      expect(editorScreen.settingsShortcutRows()).toHaveLength(50);
      expect(editorScreen.settingsSidebar().element().getBoundingClientRect().width).toBe(350);
    },
    SLOW,
  );

  it(
    'shows a Mac writer the Mac glyphs',
    async () => {
      onPlatform(MAC_AGENT);
      fakeEditablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openShortcuts();

      const rows = editorScreen.settingsShortcutRows();
      expect(rows).toContain('Bold⌘B');
      expect(rows).toContain('Strike through⌃⌥U');
      expect(rows).toContain('Inline code⌃⇧K');
      expect(rows).toContain('Toggle card edit mode⌘↩');
      expect(rows).toContain('Publish⌘⇧P');
      expect(rows).toContain('Image/image');
      expect(rows).toContain('Divider---or/hr');
    },
    SLOW,
  );

  it(
    'names the modifier a glyph stands for when the writer hovers it',
    async () => {
      onPlatform(MAC_AGENT);
      fakeEditablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openShortcuts();

      await userEvent.hover(page.getByRole('img', { name: 'Command', exact: true }).first());

      // The tooltip opens after Radix's hover delay.
      await expect.element(page.getByText('Command'), { timeout: SLOW }).toBeVisible();
    },
    SLOW,
  );

  it(
    'shows everyone else the key names instead',
    async () => {
      onPlatform(WINDOWS_AGENT);
      fakeEditablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openShortcuts();

      const rows = editorScreen.settingsShortcutRows();
      expect(rows).toContain('BoldCtrlB');
      expect(rows).toContain('Strike throughCtrlAltU');
      expect(rows).toContain('Inline codeCtrlShiftK');
      expect(rows).toContain('Toggle card edit modeCtrlEnter');
      expect(rows).toContain('PublishCtrlShiftP');
      // A slash command is the same text whatever the writer is typing it on.
      expect(rows).toContain('Image/image');
    },
    SLOW,
  );

  it(
    'closes the pane on Escape and returns focus to the row',
    async () => {
      fakeEditablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openShortcuts();

      await userEvent.keyboard('{Escape}');

      await expect(editorScreen.settingsSubviewPane()).toHaveCount(0);
      await expect.element(editorScreen.settingsSubviewRow(ROW_LABEL)).toHaveFocus();
    },
    SLOW,
  );

  it(
    'gives a contributor the same reference list',
    async () => {
      onPlatform(MAC_AGENT);
      // A contributor may only open a draft they authored.
      fakeEditablePost({ authors: [{ id: CURRENT_USER_ID }] });
      await renderAdminApp(`/editor/post/${POST_ID}`, asRole('Contributor'));
      await openShortcuts();

      expect(editorScreen.settingsShortcutRows()).toHaveLength(50);
      expect(editorScreen.settingsShortcutRows()).toContain('Bold⌘B');
    },
    SLOW,
  );
});
