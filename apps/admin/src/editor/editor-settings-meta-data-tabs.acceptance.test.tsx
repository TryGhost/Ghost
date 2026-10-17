import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import {
  settingsFacebookCardRow,
  settingsMetaDataBackButton,
  settingsMetaDataRow,
  settingsXCardRow,
} from '@tryghost/test-data/selectors/editor';

import {
  fakeAdminEndpoint,
  fakeEditorChrome,
  fakeEditorPost,
  fakeTiers,
  renderAdminApp,
  settleTransitions,
  withoutAutosave,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';
import { publishScreen } from '@/editor/publish/publish.screen';

const POST_ID = 'abc123';

const withTabs = () => withoutAutosave({ labs: { admin7EditorImprovements: true } });

function fakeSavablePost() {
  fakeEditorChrome();
  fakeTiers([]);
  fakeAdminEndpoint('GET', /^\/slugs\/post\//, ({ url }) => ({
    slugs: [{ slug: decodeURIComponent(url.split('/slugs/post/')[1].split('/')[0]) }],
  }));
  // The site's member total, which the publish inputs read before Publish is offered.
  fakeAdminEndpoint('GET', /^\/members\/\?.*order=id/, {
    members: [],
    meta: { pagination: { page: 1, limit: 1, pages: 1, total: 20, next: null, prev: null } },
  });
  return fakeEditorPost({ meta_title: null, og_title: null, twitter_title: null, tags: [] });
}

const tab = (name: 'Search' | 'X card' | 'Facebook card') => page.getByRole('tab', { name });

async function openMetaData() {
  await editorScreen.settingsToggle().click();
  await expect.element(editorScreen.settingsSidebar()).toBeVisible();
  await settleTransitions();
  await editorScreen.settingsSubviewRow(settingsMetaDataRow).click();
  await expect.element(editorScreen.settingsSubviewPane()).toBeVisible();
}

describe('Post settings Meta data tabs (admin7EditorImprovements)', () => {
  it('holds the X and Facebook cards as tabs of one pane that opens on Search', async () => {
    fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, withTabs());
    await editorScreen.settingsToggle().click();
    await settleTransitions();

    await expect.element(editorScreen.settingsSubviewRow(settingsMetaDataRow)).toBeVisible();
    await expect(editorScreen.settingsSubviewRow(settingsXCardRow)).toHaveCount(0);
    await expect(editorScreen.settingsSubviewRow(settingsFacebookCardRow)).toHaveCount(0);

    await editorScreen.settingsSubviewRow(settingsMetaDataRow).click();
    await expect.element(tab('Search')).toHaveAttribute('aria-selected', 'true');
    await expect.element(editorScreen.settingsMetaTitle()).toBeVisible();

    await tab('X card').click();
    await expect.element(editorScreen.settingsXTitle()).toBeVisible();
    await expect(editorScreen.settingsMetaTitle()).toHaveCount(0);

    // Reopening from the row starts on Search again.
    await editorScreen.settingsSubviewBack(settingsMetaDataBackButton).click();
    await editorScreen.settingsSubviewRow(settingsMetaDataRow).click();
    await expect.element(tab('Search')).toHaveAttribute('aria-selected', 'true');
    await expect.element(editorScreen.settingsMetaTitle()).toBeVisible();
  });

  it('opens the tab of a card field a publish refuses', async () => {
    const saveApi = fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, withTabs());
    await openMetaData();

    await tab('Facebook card').click();
    await editorScreen.settingsFacebookTitle().fill('a'.repeat(301));
    await tab('Search').click();
    await expect(editorScreen.settingsFacebookTitle()).toHaveCount(0);

    await expect.element(editorScreen.publishButton()).toBeEnabled();
    await editorScreen.publishButton().click();

    await expect.element(tab('Facebook card')).toHaveAttribute('aria-selected', 'true');
    await expect.element(editorScreen.settingsFacebookTitle()).toHaveFocus();
    await expect
      .element(editorScreen.saveError())
      .toHaveTextContent('Facebook title cannot be longer than 300 characters.');
    await expect(publishScreen.root()).toHaveCount(0);
    expect(saveApi.requests).toHaveLength(0);
  });
});
