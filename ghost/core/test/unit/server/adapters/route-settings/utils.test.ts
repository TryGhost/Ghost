import assert from 'node:assert/strict';
import {describe, it} from 'vitest';

import {getBackupRouteSettingsFilePath} from '../../../../../core/server/adapters/route-settings/utils';

describe('UNIT: route-settings adapter utils', function () {
    describe('getBackupRouteSettingsFilePath', function () {
        // Same naming scheme as the legacy SettingsPathManager.getBackupFilePath:
        // routes-yyyy-MM-dd-HH-mm-ss.<ext> next to the canonical file.
        it('produces a timestamped sibling path preserving the extension', function () {
            assert.match(
                getBackupRouteSettingsFilePath('/content/settings/routes.json'),
                /^\/content\/settings\/routes-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.json$/
            );
            assert.match(
                getBackupRouteSettingsFilePath('/content/settings/routes.yaml'),
                /^\/content\/settings\/routes-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.yaml$/
            );
        });
    });
});
