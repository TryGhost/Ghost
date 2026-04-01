// Filename must match the docName specified in ../../../email-design-settings.js
/* eslint-disable ghost/filenames/match-regex */

const {ValidationError} = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const ALLOWED_BUTTON_CORNERS = ['square', 'rounded', 'pill'];
const ALLOWED_BUTTON_STYLES = ['fill', 'outline'];
const ALLOWED_LINK_STYLES = ['underline', 'regular', 'bold'];
const ALLOWED_FONT_CATEGORIES = ['serif', 'sans_serif'];
const ALLOWED_TITLE_FONT_WEIGHTS = ['normal', 'medium', 'semibold', 'bold'];
const ALLOWED_IMAGE_CORNERS = ['square', 'rounded'];

const messages = {
    invalidButtonCorners: `button_corners must be one of: ${ALLOWED_BUTTON_CORNERS.join(', ')}`,
    invalidButtonStyle: `button_style must be one of: ${ALLOWED_BUTTON_STYLES.join(', ')}`,
    invalidLinkStyle: `link_style must be one of: ${ALLOWED_LINK_STYLES.join(', ')}`,
    invalidBodyFontCategory: `body_font_category must be one of: ${ALLOWED_FONT_CATEGORIES.join(', ')}`,
    invalidTitleFontCategory: `title_font_category must be one of: ${ALLOWED_FONT_CATEGORIES.join(', ')}`,
    invalidTitleFontWeight: `title_font_weight must be one of: ${ALLOWED_TITLE_FONT_WEIGHTS.join(', ')}`,
    invalidImageCorners: `image_corners must be one of: ${ALLOWED_IMAGE_CORNERS.join(', ')}`
};

/**
 * Validates enum fields on email design settings data.
 * @param {object} frame - The API frame containing the request data
 * @returns {Promise<void>}
 */
const validateEmailDesignSetting = async function (frame) {
    if (!frame.data.email_design_settings || !frame.data.email_design_settings[0]) {
        return Promise.resolve();
    }

    const data = frame.data.email_design_settings[0];

    if (data.button_corners !== undefined && !ALLOWED_BUTTON_CORNERS.includes(data.button_corners)) {
        return Promise.reject(new ValidationError({
            message: tpl(messages.invalidButtonCorners),
            property: 'button_corners'
        }));
    }

    if (data.button_style !== undefined && !ALLOWED_BUTTON_STYLES.includes(data.button_style)) {
        return Promise.reject(new ValidationError({
            message: tpl(messages.invalidButtonStyle),
            property: 'button_style'
        }));
    }

    if (data.link_style !== undefined && !ALLOWED_LINK_STYLES.includes(data.link_style)) {
        return Promise.reject(new ValidationError({
            message: tpl(messages.invalidLinkStyle),
            property: 'link_style'
        }));
    }

    if (data.body_font_category !== undefined && !ALLOWED_FONT_CATEGORIES.includes(data.body_font_category)) {
        return Promise.reject(new ValidationError({
            message: tpl(messages.invalidBodyFontCategory),
            property: 'body_font_category'
        }));
    }

    if (data.title_font_category !== undefined && !ALLOWED_FONT_CATEGORIES.includes(data.title_font_category)) {
        return Promise.reject(new ValidationError({
            message: tpl(messages.invalidTitleFontCategory),
            property: 'title_font_category'
        }));
    }

    if (data.title_font_weight !== undefined && !ALLOWED_TITLE_FONT_WEIGHTS.includes(data.title_font_weight)) {
        return Promise.reject(new ValidationError({
            message: tpl(messages.invalidTitleFontWeight),
            property: 'title_font_weight'
        }));
    }

    if (data.image_corners !== undefined && !ALLOWED_IMAGE_CORNERS.includes(data.image_corners)) {
        return Promise.reject(new ValidationError({
            message: tpl(messages.invalidImageCorners),
            property: 'image_corners'
        }));
    }

    return Promise.resolve();
};

module.exports = {
    async edit(apiConfig, frame) {
        await validateEmailDesignSetting(frame);
    }
};
