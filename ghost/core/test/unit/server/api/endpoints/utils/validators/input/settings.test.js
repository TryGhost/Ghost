const assert = require('node:assert/strict');

const settingsValidator = require('../../../../../../../../core/server/api/endpoints/utils/validators/input/settings');

const DEFAULT_SPACER_IMAGE_URL_TEMPLATE = 'https://img.spacergif.org/v1/{width}x{height}/0a/spacer.png';

describe('api/endpoints/utils/validators/input/settings', function () {
    describe('spacer_image_url_template', function () {
        it('accepts the Ghost default', async function () {
            const frame = {data: {settings: [{key: 'spacer_image_url_template', value: DEFAULT_SPACER_IMAGE_URL_TEMPLATE}]}};

            await settingsValidator.edit({}, frame);
        });

        it('accepts disabled spacer images', async function () {
            const frame = {data: {settings: [{key: 'spacer_image_url_template', value: ''}]}};

            await settingsValidator.edit({}, frame);
        });

        it('accepts disabled spacer images normalized to null', async function () {
            const frame = {data: {settings: [{key: 'spacer_image_url_template', value: null}]}};

            await settingsValidator.edit({}, frame);
        });

        it('rejects custom URL templates', async function () {
            const frame = {data: {settings: [{key: 'spacer_image_url_template', value: 'https://example.com/{width}x{height}.png'}]}};

            await assert.rejects(
                settingsValidator.edit({}, frame),
                {property: 'spacer_image_url_template'}
            );
        });
    });
});
