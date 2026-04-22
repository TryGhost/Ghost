// @ts-check
const {textColorForBackgroundColor} = require('@tryghost/color-utils');

const DEFAULT_ACCENT_COLOR = '#15212A';
const DEFAULT_DIVIDER_COLOR = '#e0e7eb';
const VALID_HEX_REGEX = /^#([0-9a-f]{3}){1,2}$/i;

/**
 * @param {unknown} value
 * @returns {value is string}
 */
const isValidHexColor = value => (typeof value === 'string') && VALID_HEX_REGEX.test(value);

/**
 * @param {unknown} value
 * @param {string} fallback
 * @returns {string}
 */
const getHexColor = (value, fallback) => (isValidHexColor(value) ? value : fallback);

/**
 * @param {string} color
 * @returns {boolean}
 */
const isDark = color => textColorForBackgroundColor(color).hex().toLowerCase() === '#ffffff';

/**
 * @typedef {object} EmailDesign
 * @prop {string} accentColor
 * @prop {string} accentContrastColor
 * @prop {string} backgroundColor
 * @prop {boolean} backgroundIsDark
 * @prop {string} buttonBorderRadius
 * @prop {string} buttonColor
 * @prop {string} buttonTextColor
 * @prop {string} dividerColor
 * @prop {boolean} hasOutlineButtons
 * @prop {null | string} buttonCorners
 * @prop {null | string} buttonStyle
 * @prop {null | string} imageCorners
 * @prop {boolean} hasRoundedImageCorners
 * @prop {null | string} headerBackgroundColor
 * @prop {boolean} headerBackgroundIsDark
 * @prop {string} linkColor
 * @prop {string} linkStyle
 * @prop {string} postTitleColor
 * @prop {null | string} sectionTitleColor
 * @prop {string} textColor
 * @prop {string} titleFontWeight
 * @prop {string} titleStrongWeight
 * @prop {string} titleWeight
 */

/**
 * @param {object} settings
 * @param {unknown} settings.accentColor
 * @param {unknown} settings.backgroundColor
 * @param {unknown} settings.buttonColor
 * @param {unknown} settings.buttonCorners
 * @param {unknown} settings.buttonStyle
 * @param {unknown} settings.dividerColor
 * @param {unknown} settings.headerBackgroundColor
 * @param {unknown} settings.imageCorners
 * @param {unknown} settings.linkColor
 * @param {unknown} settings.linkStyle
 * @param {unknown} settings.postTitleColor
 * @param {unknown} settings.sectionTitleColor
 * @param {unknown} settings.titleFontWeight
 * @returns {EmailDesign}
 */
exports.getEmailDesign = (settings) => {
    const accentColor = getHexColor(settings.accentColor, DEFAULT_ACCENT_COLOR);

    const accentContrastColor = textColorForBackgroundColor(accentColor).hex();

    const backgroundColor = getHexColor(settings.backgroundColor, '#ffffff');

    const buttonCorners = typeof settings.buttonCorners === 'string' ? settings.buttonCorners : null;

    let buttonBorderRadius;
    switch (buttonCorners) {
    case 'square':
        buttonBorderRadius = '0';
        break;
    case 'pill':
        buttonBorderRadius = '9999px';
        break;
    default:
        buttonBorderRadius = '6px';
        break;
    }

    let buttonColor;
    switch (settings.buttonColor) {
    case 'accent':
        buttonColor = accentColor;
        break;
    case null:
        buttonColor = textColorForBackgroundColor(backgroundColor).hex();
        break;
    default:
        buttonColor = getHexColor(settings.buttonColor, accentColor);
        break;
    }

    let dividerColor;
    if (settings.dividerColor === 'accent') {
        dividerColor = accentColor;
    } else {
        dividerColor = getHexColor(settings.dividerColor, DEFAULT_DIVIDER_COLOR);
    }

    let headerBackgroundColor;
    if (settings.headerBackgroundColor === 'accent') {
        headerBackgroundColor = accentColor;
    } else if (isValidHexColor(settings.headerBackgroundColor)) {
        headerBackgroundColor = settings.headerBackgroundColor;
    } else {
        headerBackgroundColor = null;
    }

    const imageCorners = typeof settings.imageCorners === 'string' ? settings.imageCorners : null;

    let linkColor;
    switch (settings.linkColor) {
    case 'accent':
        linkColor = accentColor;
        break;
    case null:
        linkColor = textColorForBackgroundColor(backgroundColor).hex();
        break;
    default:
        linkColor = getHexColor(settings.linkColor, accentColor);
        break;
    }

    let postTitleColor;
    if (settings.postTitleColor === 'accent') {
        postTitleColor = accentColor;
    } else if (isValidHexColor(settings.postTitleColor)) {
        postTitleColor = settings.postTitleColor;
    } else {
        const postTitleBackgroundColor = headerBackgroundColor || backgroundColor;
        postTitleColor = textColorForBackgroundColor(postTitleBackgroundColor).hex();
    }

    let sectionTitleColor;
    if (settings.sectionTitleColor === 'accent') {
        sectionTitleColor = accentColor;
    } else if (isValidHexColor(settings.sectionTitleColor)) {
        sectionTitleColor = settings.sectionTitleColor;
    } else {
        sectionTitleColor = null;
    }

    let titleWeight;
    switch (settings.titleFontWeight) {
    case 'normal':
        titleWeight = 400;
        break;
    case 'medium':
        titleWeight = 500;
        break;
    case 'semibold':
        titleWeight = 600;
        break;
    default:
        titleWeight = 700;
        break;
    }

    return {
        accentColor,
        accentContrastColor,
        backgroundColor,
        backgroundIsDark: isDark(backgroundColor),
        buttonBorderRadius,
        buttonColor,
        buttonCorners,
        buttonStyle: typeof settings.buttonStyle === 'string' ? settings.buttonStyle : null,
        buttonTextColor: textColorForBackgroundColor(buttonColor).hex(),
        dividerColor,
        hasOutlineButtons: settings.buttonStyle === 'outline',
        hasRoundedImageCorners: imageCorners === 'rounded',
        headerBackgroundColor,
        headerBackgroundIsDark: isDark(headerBackgroundColor || backgroundColor),
        imageCorners,
        linkColor,
        linkStyle: typeof settings.linkStyle === 'string' ? settings.linkStyle : 'underline',
        postTitleColor,
        sectionTitleColor,
        textColor: textColorForBackgroundColor(backgroundColor).hex(),
        // Some consumers want the weight as is (`titleFontWeight`) where others want it as a stringified number (`titleWeight`).
        titleFontWeight: typeof settings.titleFontWeight === 'string' ? settings.titleFontWeight : null,
        titleStrongWeight: String(titleWeight < 700 ? 700 : 800),
        titleWeight: String(titleWeight)
    };
};
