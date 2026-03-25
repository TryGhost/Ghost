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
    // TEMPORARY: To make this change easier to review, I've copy-pasted the
    // original version where applicable. I will remove this in a followup
    // commit.

    // ORIGINALLY:
    // #getAccentColor() {
    //     let accentColor = this.#settingsCache?.get('accent_color') || DEFAULT_ACCENT_COLOR;
    //
    //     if (!VALID_HEX_REGEX.test(accentColor)) {
    //         accentColor = DEFAULT_ACCENT_COLOR;
    //     }
    //
    //     return accentColor;
    // }
    const accentColor = getHexColor(settings.accentColor, DEFAULT_ACCENT_COLOR);

    // ORIGINALLY:
    // #getAccentContrastColor() {
    //     const accentColor = this.#getAccentColor();
    //     return textColorForBackgroundColor(accentColor).hex();
    // }
    const accentContrastColor = textColorForBackgroundColor(accentColor).hex();

    // ORIGINALLY:
    // #getBackgroundColor(newsletter) {
    //     /** @type {'light' | string | null} */
    //     const value = newsletter?.get('background_color');
    //
    //     if (VALID_HEX_REGEX.test(value)) {
    //         return value;
    //     }
    //
    //     // value === null, value is not valid hex
    //     return '#ffffff';
    // }
    const backgroundColor = getHexColor(settings.backgroundColor, '#ffffff');

    // ORIGINALLY:
    // buttonCorners: newsletter?.get('button_corners'),
    const buttonCorners = typeof settings.buttonCorners === 'string' ? settings.buttonCorners : null;

    // ORIGINALLY:
    // let buttonBorderRadius = '6px';
    // if (newsletter.get('button_corners') === 'square') {
    //     buttonBorderRadius = '0';
    // } else if (newsletter.get('button_corners') === 'pill') {
    //     buttonBorderRadius = '9999px';
    // }
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

    // ORIGINALLY:
    // #getButtonColor(newsletter, accentColor) {
    //     /** @type {'accent' | string | null} */
    //     const buttonColor = newsletter?.get('button_color');
    //
    //     if (buttonColor === 'accent') {
    //         return accentColor;
    //     }
    //
    //     if (buttonColor === null) {
    //         const backgroundColor = this.#getBackgroundColor(newsletter);
    //         return textColorForBackgroundColor(backgroundColor).hex();
    //     }
    //
    //     if (VALID_HEX_REGEX.test(buttonColor)) {
    //         return buttonColor;
    //     }
    //
    //     return accentColor; // default to accent color
    // }
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

    // ORIGINALLY:
    // #getDividerColor(newsletter) {
    //     const value = newsletter?.get('divider_color');
    //
    //     if (value === 'accent') {
    //         return this.#getAccentColor();
    //     } else if (VALID_HEX_REGEX.test(value)) {
    //         return value;
    //     } else {
    //         // value === 'light'/missing/invalid
    //         return '#e0e7eb';
    //     }
    // }
    let dividerColor;
    if (settings.dividerColor === 'accent') {
        dividerColor = accentColor;
    } else {
        dividerColor = getHexColor(settings.dividerColor, DEFAULT_DIVIDER_COLOR);
    }

    // ORIGINALLY:
    // #getHeaderBackgroundColor(newsletter, accentColor) {
    //     const value = newsletter?.get('header_background_color');
    //
    //     if (value === 'transparent') {
    //         return null;
    //     }
    //
    //     if (value === 'accent') {
    //         return accentColor;
    //     }
    //
    //     if (VALID_HEX_REGEX.test(value)) {
    //         return value;
    //     }
    //
    //     return null;
    // }
    let headerBackgroundColor;
    if (settings.headerBackgroundColor === 'accent') {
        headerBackgroundColor = accentColor;
    } else if (isValidHexColor(settings.headerBackgroundColor)) {
        headerBackgroundColor = settings.headerBackgroundColor;
    } else {
        headerBackgroundColor = null;
    }

    // ORIGINALLY:
    // imageCorners: newsletter?.get('image_corners')
    const imageCorners = typeof settings.imageCorners === 'string' ? settings.imageCorners : null;

    // ORIGINALLY:
    // #getLinkColor(newsletter, accentColor) {
    //     const value = newsletter.get('link_color');
    //
    //     if (value === 'accent') {
    //         return accentColor;
    //     }
    //
    //     if (value === null) {
    //         return textColorForBackgroundColor(this.#getBackgroundColor(newsletter)).hex();
    //     }
    //
    //     if (VALID_HEX_REGEX.test(value)) {
    //         return value;
    //     }
    //
    //     return accentColor; // default to accent color
    // }
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

    // ORIGINALLY:
    // #getPostTitleColor(newsletter, accentColor) {
    //     /** @type {'accent' | string | null} */
    //     const value = newsletter?.get('post_title_color');
    //
    //     if (VALID_HEX_REGEX.test(value)) {
    //         return value;
    //     }
    //
    //     if (value === 'accent') {
    //         return accentColor;
    //     }
    //
    //     // value === null, value is not valid hex
    //     const backgroundColor = this.#getHeaderBackgroundColor(newsletter, accentColor) || this.#getBackgroundColor(newsletter);
    //     return textColorForBackgroundColor(backgroundColor).hex();
    // }
    let postTitleColor;
    if (settings.postTitleColor === 'accent') {
        postTitleColor = accentColor;
    } else if (isValidHexColor(settings.postTitleColor)) {
        postTitleColor = settings.postTitleColor;
    } else {
        const postTitleBackgroundColor = headerBackgroundColor || backgroundColor;
        postTitleColor = textColorForBackgroundColor(postTitleBackgroundColor).hex();
    }

    // ORIGINALLY:
    // #getSectionTitleColor(newsletter, accentColor) {
    //     /** @type {'accent' | string | null} */
    //     const value = newsletter.get('section_title_color');
    //
    //     if (VALID_HEX_REGEX.test(value)) {
    //         return value;
    //     }
    //
    //     if (value === 'accent') {
    //         return accentColor;
    //     }
    //
    //     return null;
    // }
    let sectionTitleColor;
    if (settings.sectionTitleColor === 'accent') {
        sectionTitleColor = accentColor;
    } else if (isValidHexColor(settings.sectionTitleColor)) {
        sectionTitleColor = settings.sectionTitleColor;
    } else {
        sectionTitleColor = null;
    }

    // ORIGINALLY:
    // #getTitleWeight(newsletter) {
    //     const weights = {
    //         normal: '400',
    //         medium: '500',
    //         semibold: '600',
    //         bold: '700'
    //     };
    //
    //     /** @type {'normal' | 'medium' | 'semibold' | 'bold' | string | null} */
    //     const settingValue = newsletter.get('title_font_weight');
    //
    //     return weights[settingValue] || weights.bold;
    // }
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
        // ORIGINALLY:
        // #checkIfBackgroundIsDark(newsletter) {
        //     const backgroundColor = this.#getBackgroundColor(newsletter);
        //     return textColorForBackgroundColor(backgroundColor).hex().toLowerCase() === '#ffffff';
        // }
        backgroundIsDark: isDark(backgroundColor),
        buttonBorderRadius,
        buttonColor,
        buttonCorners,
        // ORIGINALLY:
        // buttonStyle: newsletter?.get('button_style'),
        buttonStyle: typeof settings.buttonStyle === 'string' ? settings.buttonStyle : null,
        // ORIGINALLY:
        // // white/black for dark/light button colors
        // // outline buttons use button color as text color but that's handled in styles
        // #getButtonTextColor(newsletter, accentColor) {
        //     const buttonColor = this.#getButtonColor(newsletter, accentColor);
        //     return textColorForBackgroundColor(buttonColor).hex();
        // }
        buttonTextColor: textColorForBackgroundColor(buttonColor).hex(),
        dividerColor,
        // ORIGINALLY:
        // const hasOutlineButtons = newsletter.get('button_style') === 'outline';
        hasOutlineButtons: settings.buttonStyle === 'outline',
        // ORIGINALLY:
        // #getImageCorners(newsletter) {
        //     const value = newsletter.get('image_corners');
        //     if (value === 'rounded') {
        //         return true;
        //     }
        //     return false;
        // }
        hasRoundedImageCorners: imageCorners === 'rounded',
        headerBackgroundColor,
        // ORIGINALLY:
        // const headerBackgroundIsDark = textColorForBackgroundColor(headerBackgroundColor || backgroundColor).hex().toLowerCase() === '#ffffff';
        headerBackgroundIsDark: isDark(headerBackgroundColor || backgroundColor),
        imageCorners,
        linkColor,
        // ORIGINALLY:
        // const linkStyle = newsletter.get('link_style') || 'underline';
        linkStyle: typeof settings.linkStyle === 'string' ? settings.linkStyle : 'underline',
        postTitleColor,
        sectionTitleColor,
        // ORIGINALLY:
        // const textColor = textColorForBackgroundColor(backgroundColor).hex(); // this is used by the header background color so keeping it separate from the content text color
        textColor: textColorForBackgroundColor(backgroundColor).hex(),
        // Some consumers want the weight as is (`titleFontWeight`) where others want it as a stringified number (`titleWeight`).
        // ORIGINALLY:
        // titleFontWeight: newsletter?.get('title_font_weight'),
        titleFontWeight: typeof settings.titleFontWeight === 'string' ? settings.titleFontWeight : null,
        // ORIGINALLY:
        // #getTitleStrongWeight(titleWeight) {
        //     const numericWeight = parseInt(titleWeight, 10);
        //
        //     if (isNaN(numericWeight)) {
        //         return '800';
        //     }
        //
        //     // when titleWeight has been set to less than bold,
        //     // reduce boldness of strong to match our other strong text
        //     if (numericWeight < 700) {
        //         return '700';
        //     } else {
        //         return '800';
        //     }
        // }
        titleStrongWeight: String(titleWeight < 700 ? 700 : 800),
        titleWeight: String(titleWeight)
    };
};
