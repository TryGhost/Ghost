import { expect, it } from 'vitest';
import { settingsResponse } from '@tryghost/test-data';
import {
  fakeEditorChrome,
  fakeAdminEndpoint,
  fakeEditorPost,
  renderAdminApp,
  withFastAutosave,
  submittedPost,
} from '@test-utils/acceptance';
import { editorScreen } from './editor.screen';

// An older Core can expose the experiment before it supports the install setting.
it('keeps existing add-on content editable when the backend lacks add-on support', async () => {
  const card = {
    type: 'addon',
    version: 1,
    id: 'stable-card',
    addonHandle: 'podcast',
    blockName: 'episode',
    label: 'Episode',
    props: { show_id: 'show-one' },
    html: '<p>Saved episode</p>',
  };
  const lexical = JSON.stringify({
    root: { type: 'root', version: 1, direction: null, format: '', indent: 0, children: [card] },
  });
  fakeEditorChrome();
  fakeAdminEndpoint('GET', '/slugs/post/still-editable/abc123/', {
    slugs: [{ slug: 'still-editable' }],
  });
  const save = fakeEditorPost({ lexical });
  const settings = settingsResponse();
  settings.settings = settings.settings.filter((setting) => setting.key !== 'addons');
  await renderAdminApp(
    '/editor/post/abc123',
    withFastAutosave({
      labs: { editorReact: true, addons: true },
      boot: { browseSettings: { response: settings } },
    }),
  );
  await expect.element(editorScreen.body()).toBeVisible();
  await editorScreen.titleInput().fill('Still editable');
  await editorScreen.body().click();
  await expect(save).toHaveSavedFields({ title: 'Still editable' });
  // A title edit must not erase the card, even without an installed provider.
  const saved = submittedPost(save).lexical;
  if (typeof saved === 'string') {
    expect((JSON.parse(saved) as { root: { children: unknown[] } }).root.children[0]).toMatchObject(
      card,
    );
  } else {
    // The session can omit an unchanged body entirely.
    expect(saved).toBeUndefined();
  }
});
