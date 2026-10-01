import { describe, expect, it } from 'vitest';

import {
  configResponse,
  fakeEditorChrome,
  renderAdminApp,
  settingsResponse,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';

describe('renderAdminApp labs + boot', () => {
  // editorReact defaults off and gates which implementation serves /editor,
  // so the React editor appearing proves the flag survived the boot overrides.
  it('applies labs flags alongside browseConfig and browseSettings overrides', async () => {
    fakeEditorChrome();
    await renderAdminApp('/editor/post', {
      labs: { editorReact: true },
      boot: {
        browseConfig: { response: configResponse() },
        browseSettings: { response: settingsResponse() },
      },
    });

    await expect.element(editorScreen.root()).toBeVisible();
  });
});
