const assert = require('node:assert/strict');
const rewire = require('rewire');

const settingsSerializer = rewire('../../../../../../../../core/server/api/endpoints/utils/serializers/input/settings');

describe('Settings input serializer', function () {
    describe('editable settings', function () {
        it('allows spacer image provider settings through Admin API edits', function () {
            const editableSettings = settingsSerializer.__get__('EDITABLE_SETTINGS');

            assert.ok(editableSettings.includes('spacer_image_url_template'));
        });
    });
});
