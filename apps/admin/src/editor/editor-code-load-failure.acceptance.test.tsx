import { expect, it, vi } from 'vitest';
import { settingsCodeInjectionRow } from '@tryghost/test-data/selectors/editor';

import {
  failModuleLoads,
  fakeAdminEndpoint,
  fakeEditorChrome,
  fakeEditorPost,
  fakeTiers,
  renderAdminApp,
  settleTransitions,
  withoutAutosave,
} from '@test-utils/acceptance';
import { reloadAdmin } from '@/auth/reload';
import { editorScreen } from './editor.screen';
import { readLocalRevisions } from './local-revisions';

vi.mock('@/auth/reload', () => ({ reloadAdmin: vi.fn() }));

it('keeps the unsaved draft when code the open editor needs fails to load', async () => {
  await failModuleLoads('/shade/src/components/ui/code-editor-view.tsx');
  fakeEditorChrome();
  fakeTiers([]);
  fakeAdminEndpoint('GET', /^\/slugs\/post\//, { slugs: [{ slug: 'hello-from-react' }] });
  fakeEditorPost({ tags: [] });
  const draftsAtReload: string[] = [];
  vi.mocked(reloadAdmin).mockImplementation(() => {
    draftsAtReload.push(readLocalRevisions(localStorage)[0]?.lexical ?? '');
  });
  await renderAdminApp('/editor/post/abc123', withoutAutosave({ labs: { editorReact: true } }));
  const body = editorScreen.body();
  await expect.element(body).toHaveTextContent('Hello from React');
  // The first change is kept at once, later ones at most once a minute.
  await body.fill('Hello from React, kept');
  await expect.poll(() => readLocalRevisions(localStorage).length).toBe(1);
  await body.fill('Hello from React, kept and unsaved');

  await editorScreen.settingsToggle().click();
  await settleTransitions();
  await editorScreen.settingsSubviewRow(settingsCodeInjectionRow).click();

  await expect.poll(() => vi.mocked(reloadAdmin).mock.calls).toEqual([['/editor/post/abc123']]);
  expect(draftsAtReload).toEqual([expect.stringContaining('kept and unsaved')]);
});
