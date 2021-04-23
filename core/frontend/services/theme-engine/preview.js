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

function getPreviewData(previewHeader, siteData) {
    // Keep the string shorter with short codes for certain parameters
    const supportedSettings = {
        c: 'accent_color',
        icon: 'icon',
        logo: 'logo',
        cover: 'cover_image'
    };

    let opts = new URLSearchParams(previewHeader);

    opts.forEach((value, key) => {
        value = decodeValue(value);
        if (supportedSettings[key]) {
            _.set(siteData, supportedSettings[key], value);
        }
    });

    siteData._preview = previewHeader;

    return siteData;
}

module.exports._PREVIEW_HEADER_NAME = PREVIEW_HEADER_NAME;
module.exports.handle = (req, siteData) => {
    if (req && req.header(PREVIEW_HEADER_NAME)) {
        siteData = getPreviewData(req.header(PREVIEW_HEADER_NAME), siteData);
    }

    return siteData;
};
