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
    d: 'description',
    bf: 'body_font',
    hf: 'heading_font',
  };

  const opts = new URLSearchParams(previewHeader);

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

// A previewed theme's assets are served under this path, followed by the preview's
// asset token and the asset's own path in the theme (/assets/_preview/<token>/built/x.css),
// so the files a stylesheet loads by relative path stay inside the preview too.
// Not a dot-segment: Ghost(Pro)'s CDN refuses paths with one (/assets/.x/ gets a 403).
const PREVIEW_ASSETS_PREFIX = '/assets/_preview/';
const PREVIEW_ASSET_PATH = /^\/assets\/_preview\/([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)(\/.*)$/;

/**
 * The preview token a page request carries: `theme_token` in the preview header
 * of a POST (Admin's previews are POSTs, never cached as the site's page)
 *
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function getPageToken(req) {
  if (req.method !== 'POST' || !req.header(PREVIEW_HEADER_NAME)) {
    return null;
  }
  return new URLSearchParams(req.header(PREVIEW_HEADER_NAME)).get('theme_token') || null;
}

/**
 * A request for one of a previewed theme's assets: its token, and the path the
 * asset has in the theme (/assets/...)
 *
 * @param {import('express').Request} req
 * @returns {{token: string, assetPath: string}|null}
 */
function getAssetRequest(req) {
  const match = req.path.match(PREVIEW_ASSET_PATH);
  return match ? { token: match[1], assetPath: `/assets${match[2]}` } : null;
}

module.exports._PREVIEW_HEADER_NAME = PREVIEW_HEADER_NAME;
module.exports.PREVIEW_ASSETS_PREFIX = PREVIEW_ASSETS_PREFIX;
module.exports.getPageToken = getPageToken;
module.exports.getAssetRequest = getAssetRequest;
module.exports.handle = (req, customThemeSettingKeys) => {
  let previewData = {};

  if (req && req.header(PREVIEW_HEADER_NAME)) {
    previewData = getPreviewData(req.header(PREVIEW_HEADER_NAME), customThemeSettingKeys);
  }

  return previewData;
};
