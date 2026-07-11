const assert = require('node:assert/strict');
const sinon = require('sinon');

const settingsSerializer = require('../../../../../../../../core/server/api/endpoints/utils/serializers/input/settings');
const settingsCache = require('../../../../../../../../core/shared/settings-cache');

describe('Settings input serializer', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('editable settings', function () {
        it('allows spacer image provider settings through Admin API edits', function () {
            sinon.stub(settingsCache, 'getAll').returns({});
            const frame = {
                data: {
                    settings: [{key: 'spacer_image_url_template', value: ''}]
                },
                options: {}
            };

            settingsSerializer.edit({}, frame);

            assert.deepEqual(frame.data.settings, [{key: 'spacer_image_url_template', value: ''}]);
        });
    });
});
