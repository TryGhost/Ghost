import assert from 'node:assert/strict';
import { afterEach, describe, it, vi } from 'vitest';

import { getBackupRouteSettingsFilePath } from '../../../../../core/server/adapters/route-settings/utils';

describe('UNIT: route-settings adapter utils', function () {
  describe('getBackupRouteSettingsFilePath', function () {
    afterEach(function () {
      vi.useRealTimers();
    });

    it('zero-pads every field of the timestamp', function () {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 0, 2, 3, 4, 5));

      assert.equal(
        getBackupRouteSettingsFilePath('/content/settings/routes.yaml'),
        '/content/settings/routes-2026-01-02-03-04-05.yaml',
      );
    });

    // Same naming scheme as the legacy SettingsPathManager.getBackupFilePath:
    // routes-yyyy-MM-dd-HH-mm-ss.<ext> next to the canonical file.
    it('produces a timestamped sibling path preserving the extension', function () {
      assert.match(
        getBackupRouteSettingsFilePath('/content/settings/routes.json'),
        /^\/content\/settings\/routes-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.json$/,
      );
      assert.match(
        getBackupRouteSettingsFilePath('/content/settings/routes.yaml'),
        /^\/content\/settings\/routes-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.yaml$/,
      );
    });
  });
});
