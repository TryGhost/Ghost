import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import type { Snippet } from '@tryghost/admin-x-framework/api/snippets';
import { snippetConfirmModal } from '@tryghost/test-data/selectors/editor';

import {
  currentUserResponse,
  fakeAdminEndpoint,
  fakeEditorPost,
  fakeEmailPreview,
  fakeNewsletters,
  fakePosts,
  fakeSnippets,
  renderAdminApp,
  staffRole,
  withoutAutosave,
  type RenderAdminAppOptions,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';

const FLAG_ON = { labs: { editorReact: true } };
const CURRENT_USER_ID = '1';

function clipboardJson(text: string): string {
  return JSON.stringify({
    namespace: 'KoenigEditor',
    nodes: [
      {
        detail: 0,
        format: 0,
        mode: 'normal',
        style: '',
        text,
        type: 'extended-text',
        version: 1,
      },
    ],
  });
}

function snippet(name: string, overrides: Partial<Snippet> = {}): Snippet {
  return {
    id: `snippet-${name}`,
    name,
    mobiledoc: '{}',
    lexical: clipboardJson(`${name} content`),
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: null,
    ...overrides,
  };
}

function fakeEditorWithSnippets(snippets: Snippet[]) {
  fakeSnippets(snippets);
  fakePosts([]);
  fakeNewsletters([]);
  fakeEmailPreview();
  return fakeEditorPost({ authors: [{ id: CURRENT_USER_ID }] });
}

function bootAsContributor(): RenderAdminAppOptions {
  const me = currentUserResponse();
  me.users[0].roles = [staffRole({ name: 'Contributor' })];
  return withoutAutosave({ ...FLAG_ON, boot: { browseMe: { response: me } } });
}

function submittedSnippet(body: unknown): Partial<Snippet> {
  return (body as { snippets: Partial<Snippet>[] }).snippets[0];
}

function snippetText(value: string | null | undefined): string[] {
  const nodes = (JSON.parse(value ?? '{}') as { nodes?: Array<{ text?: string }> }).nodes ?? [];
  return nodes.map((node) => node.text ?? '');
}

const snippetScreen = {
  confirmDialog: () => page.getByTestId(snippetConfirmModal),
  confirm: (label: string) =>
    page.getByTestId(snippetConfirmModal).getByRole('button', { name: label, exact: true }),
  saveAsSnippet: () => page.getByRole('button', { name: 'Save as snippet' }),
  bold: () => page.getByRole('button', { name: 'Bold' }),
  nameInput: () => page.getByTestId('snippet-name'),
  removeSnippet: (name: string) =>
    editorScreen.cardMenuItem(name).getByRole('button', { name: 'Remove snippet' }),
};

async function openCardMenu() {
  await editorScreen.body().click();
  await userEvent.keyboard('{End}{Enter}/');
}

// Lexical follows the document selection, which the platform's own
// line-selection keys can't set the same way on every OS.
async function selectBodyText(text: string) {
  await editorScreen.body().click();
  const textElement = editorScreen.body().getByText(text, { exact: true }).element();
  const range = document.createRange();
  range.selectNodeContents(textElement);
  document.getSelection()?.removeAllRanges();
  document.getSelection()?.addRange(range);
}

describe('Editor snippets', () => {
  it('inserts a snippet from the card menu', async () => {
    fakeEditorWithSnippets([snippet('Signature')]);
    await renderAdminApp('/editor/post/abc123', withoutAutosave(FLAG_ON));
    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');

    await openCardMenu();
    await editorScreen.cardMenuItem('Signature').click();

    await expect.element(editorScreen.body()).toHaveTextContent('Signature content');
  });

  it('saves a selection as a new snippet', async () => {
    fakeEditorWithSnippets([]);
    const addApi = fakeAdminEndpoint('POST', /^\/snippets\/\?/, ({ body }) => ({
      snippets: [{ ...snippet('Greeting'), ...submittedSnippet(body) }],
    }));
    await renderAdminApp('/editor/post/abc123', withoutAutosave(FLAG_ON));
    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');

    await selectBodyText('Hello from React');
    await snippetScreen.saveAsSnippet().click();
    await snippetScreen.nameInput().fill('Greeting');
    await userEvent.keyboard('{Enter}');

    await expect.poll(() => addApi.requests.length).toBe(1);
    const saved = submittedSnippet(addApi.lastRequest?.body);
    expect(saved.name).toBe('Greeting');
    expect(saved.mobiledoc).toBe('{}');
    expect(snippetText(saved.lexical)).toEqual(['Hello from React']);
    await expect.element(page.getByText('Snippet saved as "Greeting"')).toBeVisible();
  });

  it('overwrites a snippet saved under an existing name once confirmed', async () => {
    const existing = snippet('Greeting', { mobiledoc: '{"version":"0.3.1"}' });
    fakeEditorWithSnippets([existing]);
    const editApi = fakeAdminEndpoint('PUT', /^\/snippets\/snippet-Greeting\/\?/, ({ body }) => ({
      snippets: [{ ...existing, ...submittedSnippet(body) }],
    }));
    await renderAdminApp('/editor/post/abc123', withoutAutosave(FLAG_ON));
    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');

    await selectBodyText('Hello from React');
    await snippetScreen.saveAsSnippet().click();
    await snippetScreen.nameInput().fill('Greeting');
    await userEvent.keyboard('{Enter}');

    await expect.element(snippetScreen.confirmDialog()).toHaveTextContent('Update this snippet?');
    expect(editApi.requests).toHaveLength(0);
    await snippetScreen.confirm('Update').click();

    await expect.poll(() => editApi.requests.length).toBe(1);
    const saved = submittedSnippet(editApi.lastRequest?.body);
    expect(saved.name).toBe('Greeting');
    expect(saved.mobiledoc).toBe('{"version":"0.3.1"}');
    expect(snippetText(saved.lexical)).toEqual(['Hello from React']);
    await expect.element(page.getByText('Snippet "Greeting" updated')).toBeVisible();
  });

  it('deletes a snippet from the card menu once confirmed', async () => {
    fakeEditorWithSnippets([snippet('Signature')]);
    const deleteApi = fakeAdminEndpoint('DELETE', '/snippets/snippet-Signature/', {});
    await renderAdminApp('/editor/post/abc123', withoutAutosave(FLAG_ON));
    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');

    await openCardMenu();
    await editorScreen.cardMenuItem('Signature').hover();
    await snippetScreen.removeSnippet('Signature').click();

    await expect
      .element(snippetScreen.confirmDialog())
      .toHaveTextContent('Confirm snippet deletion');
    expect(deleteApi.requests).toHaveLength(0);
    await snippetScreen.confirm('Delete snippet').click();

    await expect.poll(() => deleteApi.requests.length).toBe(1);
    await expect(snippetScreen.confirmDialog()).toHaveCount(0);
    await expect.element(editorScreen.body()).not.toHaveTextContent('Signature content');
  });

  it.each([
    [
      'a mobiledoc-only snippet',
      {
        lexical: null,
        mobiledoc:
          '{"version":"0.3.1","atoms":[],"cards":[],"markups":[],"sections":[[1,"p",[[0,[],0,"Legacy content"]]]]}',
      },
      'Legacy content',
    ],
    [
      'a double-encoded snippet',
      { lexical: JSON.stringify(clipboardJson('Double content')) },
      'Double content',
    ],
  ])('offers and inserts %s without writing it back', async (_label, overrides, text) => {
    fakeEditorWithSnippets([snippet('Legacy', overrides)]);
    const writeApi = fakeAdminEndpoint('PUT', /^\/snippets\//, {});
    await renderAdminApp('/editor/post/abc123', withoutAutosave(FLAG_ON));
    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');

    await openCardMenu();
    await editorScreen.cardMenuItem('Legacy').click();

    await expect.element(editorScreen.body()).toHaveTextContent(text);
    expect(writeApi.requests).toHaveLength(0);
  });

  it('lets a Contributor insert snippets but not create or delete them', async () => {
    fakeEditorWithSnippets([snippet('Signature')]);
    await renderAdminApp('/editor/post/abc123', bootAsContributor());
    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');

    await selectBodyText('Hello from React');
    await expect.element(snippetScreen.bold()).toBeVisible();
    await expect(snippetScreen.saveAsSnippet()).toHaveCount(0);

    await openCardMenu();
    await expect.element(editorScreen.cardMenuItem('Signature')).toBeVisible();
    await expect(snippetScreen.removeSnippet('Signature')).toHaveCount(0);

    await editorScreen.cardMenuItem('Signature').click();
    await expect.element(editorScreen.body()).toHaveTextContent('Signature content');
  });
});
