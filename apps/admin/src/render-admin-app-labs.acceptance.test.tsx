import { describe, expect, it } from 'vitest';

import {
  configResponse,
  fakeEditorChrome,
  renderAdminApp,
  settingsResponse,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';

describe('renderAdminApp labs + boot', () => {
  // editorExcerpt defaults off and gates the excerpt field, so the field
  // appearing proves the flag survived the boot overrides.
  it('applies labs flags alongside browseConfig and browseSettings overrides', async () => {
    fakeEditorChrome();
    await renderAdminApp('/editor/post', {
      labs: { editorExcerpt: true },
      boot: {
        browseConfig: { response: configResponse() },
        browseSettings: { response: settingsResponse() },
      },
    });

    await expect.element(editorScreen.excerptInput()).toBeVisible();
  });
});
