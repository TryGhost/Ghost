// @TODO: put together a plan for how the frontend should exist as modules and move this out
// The preview header contains a query string with the custom preview data
// This is deliberately slightly obscure & means we don't need to add body parsing to the frontend :D
// If we start passing in strings like title or description we will probably need to change this
const PREVIEW_HEADER_NAME = 'x-ghost-preview';

const _ = require('lodash');

function decodeValue(value) {
    if (value === '' || value === 'null' || value === 'undefined') {
        return null;
    }

    return value;
}

function getPreviewData(previewHeader, customThemeSettingKeys = []) {
    // Keep the string shorter with short codes for certain parameters
    const supportedSettings = {
        c: 'accent_color',
        icon: 'icon',
        logo: 'logo',
        cover: 'cover_image',
        custom: 'custom',
        d: 'description'
    };

    let opts = new URLSearchParams(previewHeader);

    const previewData = {};

    opts.forEach((value, key) => {
        value = decodeValue(value);
        if (supportedSettings[key]) {
            _.set(previewData, supportedSettings[key], value);
        }
    });

    if (previewData.custom) {
        try {
            const custom = {};
            const previewCustom = JSON.parse(previewData.custom);

            if (typeof previewCustom === 'object') {
                customThemeSettingKeys.forEach((key) => {
                    custom[key] = previewCustom[key];
                });
            }

            previewData.custom = custom;
        } catch (e) {
            previewData.custom = {};
        }
    }

    previewData._preview = previewHeader;

    return previewData;
}

module.exports._PREVIEW_HEADER_NAME = PREVIEW_HEADER_NAME;
module.exports.handle = (req, customThemeSettingKeys) => {
    let previewData = {};

    if (req && req.header(PREVIEW_HEADER_NAME)) {
        previewData = getPreviewData(req.header(PREVIEW_HEADER_NAME), customThemeSettingKeys);
    }

    return previewData;
};
