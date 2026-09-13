import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { buildLexicalParagraph } from '@tryghost/test-data';
import {
  codeInjectionFootLabel,
  codeInjectionHeadLabel,
  codeInjectionPageFootLabel,
  codeInjectionPageHeadLabel,
} from '@tryghost/test-data/selectors/editor';

import {
  currentUserResponse,
  fakeAdminEndpoint,
  fakeEditorChrome,
  fakeEditorPost,
  fakePages,
  fakeTiers,
  post,
  renderAdminApp,
  staffRole,
  submittedPost,
  unsavedChangesGuarded,
  type StaffRoleName,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';

const POST_ID = 'abc123';
const CURRENT_USER_ID = '1';
const FLAG_ON = { labs: { editorReact: true } };
const LOADED_AT = '2026-01-01T00:00:00.000Z';
const PUBLISHED_AT = '2025-12-01T10:00:00.000Z';
const PAGE_ROUTE = new RegExp(`^/pages/${POST_ID}/\\?`);
// The panel's own width, and the width the wide pane widens it to.
const PANEL_WIDTH = 350;
const WIDE_PANEL_WIDTH = 500;
const BACK_LABEL = 'Close code injection panel';
const ROW_LABEL = 'Code injection';

// A settings save waits on the engine's queue, so these journeys outlast the default timeout.
const SLOW = 20_000;
const POLL = { timeout: 10_000 };
// Under the 3s autosave debounce, so only an undebounced field save can satisfy it.
const FIELD_POLL = { timeout: 2_000 };

type SavedPost = ReturnType<typeof post>;

function asRole(name: StaffRoleName) {
  const me = currentUserResponse();
  me.users[0].roles = [staffRole({ name })];
  return { ...FLAG_ON, boot: { browseMe: { response: me } } };
}

function editorChrome() {
  fakeEditorChrome();
  fakeTiers([]);
  fakeAdminEndpoint('GET', /^\/slugs\/post\//, ({ url }) => ({
    slugs: [{ slug: decodeURIComponent(url.split('/slugs/post/')[1].split('/')[0]) }],
  }));
}

/** A post that answers saves the way Ghost does: submitted fields back, fresh token. */
function fakeSavablePost(overrides: Partial<SavedPost> = {}) {
  editorChrome();
  return fakeEditorPost({
    codeinjection_head: null,
    codeinjection_foot: null,
    tags: [],
    ...overrides,
  });
}

/** The same post fixture served on the pages collection the page editor reads. */
function fakeSavablePage() {
  editorChrome();
  fakePages([]);
  const current = post({
    id: POST_ID,
    title: 'Hello from React',
    slug: 'hello-from-react',
    status: 'draft',
    lexical: buildLexicalParagraph('Hello from React'),
    updated_at: LOADED_AT,
    published_at: null,
    codeinjection_head: null,
    codeinjection_foot: null,
    tags: [],
  });

  fakeAdminEndpoint('GET', PAGE_ROUTE, () => ({ pages: [current] }));
  fakeAdminEndpoint('PUT', PAGE_ROUTE, () => ({ pages: [current] }));
}

function sidebarWidthPx(): number {
  return editorScreen.settingsSidebar().element().getBoundingClientRect().width;
}

function headEditor() {
  return editorScreen.settingsCodeInjection(codeInjectionHeadLabel);
}

function footEditor() {
  return editorScreen.settingsCodeInjection(codeInjectionFootLabel);
}

async function openCodeInjection() {
  await editorScreen.settingsToggle().click();
  await expect.element(editorScreen.settingsSidebar()).toBeVisible();
  await editorScreen.settingsSubviewRow(ROW_LABEL).click();
  await expect.element(editorScreen.settingsSubviewPane()).toBeVisible();
  await expect.element(headEditor()).toBeVisible();
  await expect.element(footEditor()).toBeVisible();
}

/**
 * Playwright clears a contenteditable by writing to the DOM, which races
 * CodeMirror's reconciliation. Clear through its own keymap first.
 */
async function typeInto(editor: ReturnType<typeof headEditor>, code: string) {
  await editor.click();
  await userEvent.keyboard('{ControlOrMeta>}a{/ControlOrMeta}');
  await userEvent.keyboard('{Backspace}');
  await expect.poll(() => editor.element().textContent).toBe('');
  if (!code) {
    return;
  }
  await editor.fill(code);
  await expect.poll(() => (editor.element() as HTMLElement).innerText).toBe(code);
}

/**
 * The sidebar's Code injection pane: the header and footer code this post adds
 * to the page it renders on.
 */
describe('Post settings code injection', () => {
  it(
    'opens the pane over the section list and comes back from it',
    async () => {
      fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openCodeInjection();

      // The pane replaces the list it was opened from, in a widened panel.
      await expect(editorScreen.settingsExcerpt()).toHaveCount(0);
      expect(sidebarWidthPx()).toBe(WIDE_PANEL_WIDTH);

      await editorScreen.settingsSubviewBack(BACK_LABEL).click();

      await expect(editorScreen.settingsSubviewPane()).toHaveCount(0);
      await expect.element(editorScreen.settingsExcerpt()).toBeVisible();
      await expect.element(editorScreen.settingsSubviewRow(ROW_LABEL)).toBeVisible();
      // The panel goes back to the width the section list is shown at.
      await expect.poll(sidebarWidthPx).toBe(PANEL_WIDTH);
    },
    SLOW,
  );

  it(
    'closes the pane on Escape from outside the editors',
    async () => {
      fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openCodeInjection();

      // Opening a pane leaves the writer on its back button.
      await expect.element(editorScreen.settingsSubviewBack(BACK_LABEL)).toHaveFocus();
      await userEvent.keyboard('{Escape}');

      await expect(editorScreen.settingsSubviewPane()).toHaveCount(0);
      await expect.element(editorScreen.settingsSubviewRow(ROW_LABEL)).toBeVisible();
    },
    SLOW,
  );

  it(
    'keeps the pane open on Escape inside an editor',
    async () => {
      fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openCodeInjection();

      await headEditor().click();
      await userEvent.keyboard('{Escape}');

      await expect.element(editorScreen.settingsSubviewPane()).toBeVisible();
      await expect.element(headEditor()).toBeVisible();
    },
    SLOW,
  );

  it(
    'moves between the editors on the Tab that follows Escape',
    async () => {
      fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openCodeInjection();

      await headEditor().click();
      await expect.element(headEditor()).toHaveFocus();

      // Without Escape first, Tab indents the code rather than leaving.
      await userEvent.keyboard('{Escape}');
      await userEvent.tab();
      await expect.element(footEditor()).toHaveFocus();

      await userEvent.keyboard('{Escape}');
      await userEvent.tab({ shift: true });
      await expect.element(headEditor()).toHaveFocus();
      await expect.element(editorScreen.settingsSubviewPane()).toBeVisible();
    },
    SLOW,
  );

  it(
    'names a page’s editors for a page',
    async () => {
      fakeSavablePage();
      await renderAdminApp(`/editor/page/${POST_ID}`, FLAG_ON);
      await editorScreen.settingsToggle().click();
      await expect.element(editorScreen.settingsSidebar()).toBeVisible();
      await editorScreen.settingsSubviewRow(ROW_LABEL).click();

      await expect
        .element(editorScreen.settingsCodeInjection(codeInjectionPageHeadLabel))
        .toBeVisible();
      await expect
        .element(editorScreen.settingsCodeInjection(codeInjectionPageFootLabel))
        .toBeVisible();
      await expect(editorScreen.settingsCodeInjection(codeInjectionHeadLabel)).toHaveCount(0);
    },
    SLOW,
  );

  it(
    'shows the code the post was saved with',
    async () => {
      const head = '<script>\n    head();\n</script>';
      const foot = '<style>\n    .footer { display: block; }\n</style>';
      fakeSavablePost({ codeinjection_head: head, codeinjection_foot: foot });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openCodeInjection();

      await expect.poll(() => (headEditor().element() as HTMLElement).innerText).toBe(head);
      await expect.poll(() => (footEditor().element() as HTMLElement).innerText).toBe(foot);
    },
    SLOW,
  );

  it(
    'persists a draft’s header and footer code on the blur that ends each edit',
    async () => {
      const saveApi = fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openCodeInjection();

      await typeInto(headEditor(), '<script>head();</script>');
      await footEditor().click();

      // A field save has no debounce, so it lands well inside the autosave's 3s.
      await expect.poll(() => saveApi.requests.length, FIELD_POLL).toBe(1);
      expect(submittedPost(saveApi)).toMatchObject({
        codeinjection_head: '<script>head();</script>',
      });

      await typeInto(footEditor(), '<script>foot();</script>');
      await headEditor().click();

      await expect.poll(() => saveApi.requests.length, POLL).toBe(2);
      expect(submittedPost(saveApi)).toMatchObject({
        codeinjection_foot: '<script>foot();</script>',
      });
      // The editors keep what the writer typed once the save is answered.
      await expect
        .poll(() => (headEditor().element() as HTMLElement).innerText)
        .toBe('<script>head();</script>');
      await expect
        .poll(() => (footEditor().element() as HTMLElement).innerText)
        .toBe('<script>foot();</script>');
    },
    SLOW,
  );

  it(
    'stages a published post’s header code until Update',
    async () => {
      const saveApi = fakeSavablePost({ status: 'published', published_at: PUBLISHED_AT });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openCodeInjection();

      await typeInto(headEditor(), '<script>staged();</script>');
      await footEditor().click();

      await expect.element(editorScreen.updateButton()).toBeEnabled();
      await expect.poll(unsavedChangesGuarded).toBe(true);
      expect(saveApi.requests).toHaveLength(0);

      await userEvent.keyboard('{Meta>}s{/Meta}');

      await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
      expect(submittedPost(saveApi)).toMatchObject({
        codeinjection_head: '<script>staged();</script>',
        status: 'published',
      });
    },
    SLOW,
  );

  it(
    'persists the focused editor when the writer closes the pane',
    async () => {
      const saveApi = fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openCodeInjection();

      await typeInto(headEditor(), '<script>onClose();</script>');
      await expect.element(headEditor()).toHaveFocus();
      await editorScreen.settingsSubviewBack(BACK_LABEL).click();

      await expect(editorScreen.settingsSubviewPane()).toHaveCount(0);
      await expect.poll(() => saveApi.requests.length, FIELD_POLL).toBe(1);
      expect(submittedPost(saveApi).codeinjection_head).toBe('<script>onClose();</script>');

      await editorScreen.settingsSubviewRow(ROW_LABEL).click();
      await expect.element(headEditor()).toHaveTextContent('<script>onClose();</script>');
    },
    SLOW,
  );

  it.each(['codeinjection_head', 'codeinjection_foot'] as const)(
    'clears saved %s code to null on blur',
    async (field) => {
      const saveApi = fakeSavablePost({
        codeinjection_head: '<script>head();</script>',
        codeinjection_foot: '<script>foot();</script>',
      });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openCodeInjection();

      const editor = field === 'codeinjection_head' ? headEditor() : footEditor();
      const otherEditor = field === 'codeinjection_head' ? footEditor() : headEditor();
      await typeInto(editor, '');
      await otherEditor.click();

      await expect.poll(() => saveApi.requests.length, FIELD_POLL).toBe(1);
      expect(submittedPost(saveApi)[field]).toBeNull();
      await expect.poll(() => editor.element().textContent).toBe('');
    },
    SLOW,
  );

  it(
    'gives a contributor the pane their role can write',
    async () => {
      // A contributor may only open a draft they authored.
      const saveApi = fakeSavablePost({ authors: [{ id: CURRENT_USER_ID }] });
      await renderAdminApp(`/editor/post/${POST_ID}`, asRole('Contributor'));
      await openCodeInjection();

      await typeInto(headEditor(), '<script>contributor();</script>');
      await footEditor().click();

      await expect
        .poll(() => submittedPost(saveApi).codeinjection_head, POLL)
        .toBe('<script>contributor();</script>');
    },
    SLOW,
  );
});
