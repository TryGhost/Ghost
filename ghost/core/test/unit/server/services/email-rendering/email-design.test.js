// @ts-check
const assert = require('node:assert/strict');
const {getEmailDesign} = require('../../../../../core/server/services/email-rendering/email-design');

const VALID_HEX_COLORS = [
    '#f00',
    '#F00',
    '#ab9801',
    '#AB9801'
];
const INVALID_HEX_COLORS = [
    null,
    undefined,
    0xabcdef,
    ['#ff9900'],
    '',
    'invalid',
    'accent',
    'light',
    'dark',
    '#',
    '#F',
    '#F0',
    '#F00A',
    '#F00AB',
    '#AB9801F',
    '#AB9801FF',
    'f00',
    'ab9801',
    'foo#AB9801',
    '#AB9801qux',
    'foo#AB9801qux'
];

/**
 * @param {string} actual
 * @param {string} expected
 */
const assertColorsEqual = (actual, expected) => {
    assert.equal(
        actual.toUpperCase(),
        expected.toUpperCase(),
        `Expected ${actual} to be the same color as ${expected}`
    );
};

describe('getEmailDesign', function () {
    /** @type {Parameters<typeof getEmailDesign>[0]} */
    const baseSettings = {
        accentColor: null,
        backgroundColor: null,
        buttonColor: null,
        buttonCorners: null,
        buttonStyle: null,
        dividerColor: null,
        headerBackgroundColor: null,
        imageCorners: 'square',
        linkColor: null,
        linkStyle: null,
        postTitleColor: null,
        sectionTitleColor: null,
        titleFontWeight: 'bold'
    };

    describe('accentColor', function () {
        it('returns the provided accent color when input is valid', function () {
            for (const accentColor of VALID_HEX_COLORS) {
                const result = getEmailDesign({...baseSettings, accentColor});
                assertColorsEqual(result.accentColor, accentColor);
            }
        });

        it('returns the default accent color when input is invalid', function () {
            for (const accentColor of INVALID_HEX_COLORS) {
                const result = getEmailDesign({...baseSettings, accentColor});
                assertColorsEqual(result.accentColor, '#15212a');
            }
        });
    });

    describe('accentContrastColor', function () {
        it('returns white for a dark accent color', function () {
            const result = getEmailDesign({...baseSettings, accentColor: '#333'});
            assertColorsEqual(result.accentContrastColor, '#ffffff');
        });

        it('returns black for a light accent color', function () {
            const result = getEmailDesign({...baseSettings, accentColor: '#ddd'});
            assertColorsEqual(result.accentContrastColor, '#000000');
        });

        it('returns white for invalid accent colors', function () {
            for (const accentColor of INVALID_HEX_COLORS) {
                const result = getEmailDesign({...baseSettings, accentColor});
                assertColorsEqual(result.accentContrastColor, '#ffffff');
            }
        });
    });

    describe('backgroundColor', function () {
        it('returns the provided background color when input is valid', function () {
            for (const backgroundColor of VALID_HEX_COLORS) {
                const result = getEmailDesign({...baseSettings, backgroundColor});
                assertColorsEqual(result.backgroundColor, backgroundColor);
            }
        });

        it('returns the default background color when input is invalid', function () {
            for (const backgroundColor of INVALID_HEX_COLORS) {
                const result = getEmailDesign({...baseSettings, backgroundColor});
                assertColorsEqual(result.backgroundColor, '#ffffff');
            }
        });
    });

    describe('backgroundIsDark', function () {
        it('returns true for dark background colors', function () {
            for (const backgroundColor of ['#000', '#333']) {
                const result = getEmailDesign({...baseSettings, backgroundColor});
                assert(result.backgroundIsDark);
            }
        });

        it('returns false for light background colors', function () {
            for (const backgroundColor of ['#fff', '#ddd']) {
                const result = getEmailDesign({...baseSettings, backgroundColor});
                assert(!result.backgroundIsDark);
            }
        });

        it('returns false for invalid background colors', function () {
            for (const backgroundColor of INVALID_HEX_COLORS) {
                const result = getEmailDesign({...baseSettings, backgroundColor});
                assert(!result.backgroundIsDark);
            }
        });
    });

    describe('buttonBorderRadius', function () {
        it('returns 0 when button corners are square', function () {
            const result = getEmailDesign({...baseSettings, buttonCorners: 'square'});
            assert.equal(result.buttonBorderRadius, '0');
        });

        it('returns 9999px when button corners are pill', function () {
            const result = getEmailDesign({...baseSettings, buttonCorners: 'pill'});
            assert.equal(result.buttonBorderRadius, '9999px');
        });

        it('returns 6px for any other value', function () {
            for (const buttonCorners of ['rounded', null, undefined, '', 'foo', 123]) {
                const result = getEmailDesign({...baseSettings, buttonCorners});
                assert.equal(result.buttonBorderRadius, '6px');
            }
        });
    });

    describe('buttonColor', function () {
        it('returns the accent color when button color is set to "accent"', function () {
            const result = getEmailDesign({...baseSettings, accentColor: '#f00', buttonColor: 'accent'});
            assertColorsEqual(result.buttonColor, '#f00');
        });

        it('returns the default accent color when the button color is set to "accent" but the accent color is invalid', function () {
            const result = getEmailDesign({...baseSettings, accentColor: 'invalid', buttonColor: 'accent'});
            assertColorsEqual(result.buttonColor, '#15212a');
        });

        it('returns the background contrast color when button color is null', function () {
            assertColorsEqual(
                getEmailDesign({...baseSettings, backgroundColor: '#333', buttonColor: null}).buttonColor,
                '#ffffff'
            );
            assertColorsEqual(
                getEmailDesign({...baseSettings, backgroundColor: '#ddd', buttonColor: null}).buttonColor,
                '#000000'
            );
        });

        it('returns the provided button color when input is valid', function () {
            for (const buttonColor of VALID_HEX_COLORS) {
                const result = getEmailDesign({...baseSettings, buttonColor});
                assertColorsEqual(result.buttonColor, buttonColor);
            }
        });

        it('returns the accent color when input is invalid', function () {
            for (const buttonColor of INVALID_HEX_COLORS.filter(color => color !== 'accent' && color !== null)) {
                const result = getEmailDesign({...baseSettings, accentColor: '#f00', buttonColor});
                assertColorsEqual(result.buttonColor, '#f00');
            }
        });
    });

    describe('buttonCorners', function () {
        it('returns the provided button corners when input is a string', function () {
            for (const buttonCorners of ['square', 'rounded', 'pill', 'foo']) {
                const result = getEmailDesign({...baseSettings, buttonCorners});
                assert.equal(result.buttonCorners, buttonCorners);
            }
        });

        it('returns null when input is not a string', function () {
            for (const buttonCorners of [null, undefined, 0, ['pill']]) {
                const result = getEmailDesign({...baseSettings, buttonCorners});
                assert.equal(result.buttonCorners, null);
            }
        });
    });

    describe('buttonStyle', function () {
        it('returns the provided button style when input is a string', function () {
            for (const buttonStyle of ['solid', 'outline', 'foo']) {
                const result = getEmailDesign({...baseSettings, buttonStyle});
                assert.equal(result.buttonStyle, buttonStyle);
            }
        });

        it('returns null when input is not a string', function () {
            for (const buttonStyle of [null, undefined, 0, ['outline']]) {
                const result = getEmailDesign({...baseSettings, buttonStyle});
                assert.equal(result.buttonStyle, null);
            }
        });
    });

    describe('buttonTextColor', function () {
        it('returns white for a dark button color', function () {
            const result = getEmailDesign({...baseSettings, buttonColor: '#333'});
            assertColorsEqual(result.buttonTextColor, '#ffffff');
        });

        it('returns black for a light button color', function () {
            const result = getEmailDesign({...baseSettings, buttonColor: '#ddd'});
            assertColorsEqual(result.buttonTextColor, '#000000');
        });

        it('returns white when the button color falls back to a dark accent color', function () {
            const result = getEmailDesign({...baseSettings, accentColor: '#333', buttonColor: 'invalid'});
            assertColorsEqual(result.buttonTextColor, '#ffffff');
        });

        it('returns black when the button color falls back to a light accent color', function () {
            const result = getEmailDesign({...baseSettings, accentColor: '#ddd', buttonColor: 'invalid'});
            assertColorsEqual(result.buttonTextColor, '#000000');
        });
    });

    describe('dividerColor', function () {
        it('returns the accent color when divider color is set to "accent"', function () {
            const result = getEmailDesign({...baseSettings, accentColor: '#f00', dividerColor: 'accent'});
            assertColorsEqual(result.dividerColor, '#f00');
        });

        it('returns the default accent color when the divider color is set to "accent" but the accent color is invalid', function () {
            const result = getEmailDesign({...baseSettings, accentColor: 'invalid', dividerColor: 'accent'});
            assertColorsEqual(result.dividerColor, '#15212a');
        });

        it('returns the provided divider color when input is valid', function () {
            for (const dividerColor of VALID_HEX_COLORS) {
                const result = getEmailDesign({...baseSettings, dividerColor});
                assertColorsEqual(result.dividerColor, dividerColor);
            }
        });

        it('returns the default divider color when input is invalid', function () {
            for (const dividerColor of INVALID_HEX_COLORS.filter(color => color !== 'accent')) {
                const result = getEmailDesign({...baseSettings, dividerColor});
                assertColorsEqual(result.dividerColor, '#e0e7eb');
            }
        });
    });

    describe('hasOutlineButtons', function () {
        it('is true when button style is outline', function () {
            const result = getEmailDesign({...baseSettings, buttonStyle: 'outline'});
            assert(result.hasOutlineButtons);
        });

        it('is false for any other value', function () {
            for (const buttonStyle of ['solid', null, undefined, '', 'foo', 123]) {
                const result = getEmailDesign({...baseSettings, buttonStyle});
                assert(!result.hasOutlineButtons);
            }
        });
    });

    describe('hasRoundedImageCorners', function () {
        it('is true if corners are set to rounded', function () {
            const result = getEmailDesign({...baseSettings, imageCorners: 'rounded'});
            assert(result.hasRoundedImageCorners);
        });

        it('is false for any other value', function () {
            for (const imageCorners of ['square', null, undefined, '', 'foo']) {
                const result = getEmailDesign({...baseSettings, imageCorners});
                assert(!result.hasRoundedImageCorners);
            }
        });
    });

    describe('headerBackgroundColor', function () {
        it('returns the accent color when header background color is set to "accent"', function () {
            const result = getEmailDesign({...baseSettings, accentColor: '#f00', headerBackgroundColor: 'accent'});
            assertColorsEqual(result.headerBackgroundColor, '#f00');
        });

        it('returns the default accent color when the header background color is set to "accent" but the accent color is invalid', function () {
            const result = getEmailDesign({...baseSettings, accentColor: 'invalid', headerBackgroundColor: 'accent'});
            assertColorsEqual(result.headerBackgroundColor, '#15212a');
        });

        it('returns the provided header background color when input is valid', function () {
            for (const headerBackgroundColor of VALID_HEX_COLORS) {
                const result = getEmailDesign({...baseSettings, headerBackgroundColor});
                assertColorsEqual(result.headerBackgroundColor, headerBackgroundColor);
            }
        });

        it('returns null when input is invalid', function () {
            for (const headerBackgroundColor of INVALID_HEX_COLORS.filter(color => color !== 'accent')) {
                const result = getEmailDesign({...baseSettings, headerBackgroundColor});
                assert.equal(result.headerBackgroundColor, null);
            }
        });
    });

    describe('headerBackgroundIsDark', function () {
        it('returns true for dark header background colors', function () {
            const result = getEmailDesign({...baseSettings, headerBackgroundColor: '#333'});
            assert(result.headerBackgroundIsDark);
        });

        it('returns false for light header background colors', function () {
            const result = getEmailDesign({...baseSettings, headerBackgroundColor: '#ddd'});
            assert(!result.headerBackgroundIsDark);
        });

        it('falls back to the background color when header background color is invalid', function () {
            assert(
                getEmailDesign({...baseSettings, backgroundColor: '#333', headerBackgroundColor: 'invalid'}).headerBackgroundIsDark
            );
            assert(
                !getEmailDesign({...baseSettings, backgroundColor: '#ddd', headerBackgroundColor: 'invalid'}).headerBackgroundIsDark
            );
        });
    });

    describe('imageCorners', function () {
        it('returns the provided image corners when input is a string', function () {
            for (const imageCorners of ['square', 'rounded', 'foo']) {
                const result = getEmailDesign({...baseSettings, imageCorners});
                assert.equal(result.imageCorners, imageCorners);
            }
        });

        it('returns null when input is not a string', function () {
            for (const imageCorners of [null, undefined, 0, ['rounded']]) {
                const result = getEmailDesign({...baseSettings, imageCorners});
                assert.equal(result.imageCorners, null);
            }
        });
    });

    describe('linkColor', function () {
        it('returns the accent color when link color is set to "accent"', function () {
            const result = getEmailDesign({...baseSettings, accentColor: '#f00', linkColor: 'accent'});
            assertColorsEqual(result.linkColor, '#f00');
        });

        it('returns the default accent color when the link color is set to "accent" but the accent color is invalid', function () {
            const result = getEmailDesign({...baseSettings, accentColor: 'invalid', linkColor: 'accent'});
            assertColorsEqual(result.linkColor, '#15212a');
        });

        it('returns the background contrast color when link color is null', function () {
            assertColorsEqual(
                getEmailDesign({...baseSettings, backgroundColor: '#333', linkColor: null}).linkColor,
                '#ffffff'
            );
            assertColorsEqual(
                getEmailDesign({...baseSettings, backgroundColor: '#ddd', linkColor: null}).linkColor,
                '#000000'
            );
        });

        it('returns the provided link color when input is valid', function () {
            for (const linkColor of VALID_HEX_COLORS) {
                const result = getEmailDesign({...baseSettings, linkColor});
                assertColorsEqual(result.linkColor, linkColor);
            }
        });

        it('returns the accent color when input is invalid', function () {
            for (const linkColor of INVALID_HEX_COLORS.filter(color => color !== 'accent' && color !== null)) {
                const result = getEmailDesign({...baseSettings, accentColor: '#f00', linkColor});
                assertColorsEqual(result.linkColor, '#f00');
            }
        });
    });

    describe('linkStyle', function () {
        it('returns the provided link style when input is a string', function () {
            for (const linkStyle of ['underline', 'plain', 'foo']) {
                const result = getEmailDesign({...baseSettings, linkStyle});
                assert.equal(result.linkStyle, linkStyle);
            }
        });

        it('returns underline when input is not a string', function () {
            for (const linkStyle of [null, undefined, 0, ['underline']]) {
                const result = getEmailDesign({...baseSettings, linkStyle});
                assert.equal(result.linkStyle, 'underline');
            }
        });
    });

    describe('postTitleColor', function () {
        it('returns the accent color when post title color is set to "accent"', function () {
            const result = getEmailDesign({...baseSettings, accentColor: '#f00', postTitleColor: 'accent'});
            assertColorsEqual(result.postTitleColor, '#f00');
        });

        it('returns the default accent color when the post title color is set to "accent" but the accent color is invalid', function () {
            const result = getEmailDesign({...baseSettings, accentColor: 'invalid', postTitleColor: 'accent'});
            assertColorsEqual(result.postTitleColor, '#15212a');
        });

        it('returns the provided post title color when input is valid', function () {
            for (const postTitleColor of VALID_HEX_COLORS) {
                const result = getEmailDesign({...baseSettings, postTitleColor});
                assertColorsEqual(result.postTitleColor, postTitleColor);
            }
        });

        it('returns the header background contrast color when input is invalid and the header background color is set', function () {
            assertColorsEqual(
                getEmailDesign({...baseSettings, headerBackgroundColor: '#333', postTitleColor: 'invalid'}).postTitleColor,
                '#ffffff'
            );
            assertColorsEqual(
                getEmailDesign({...baseSettings, headerBackgroundColor: '#ddd', postTitleColor: 'invalid'}).postTitleColor,
                '#000000'
            );
        });

        it('returns the background contrast color when input is invalid and the header background color is not set', function () {
            assertColorsEqual(
                getEmailDesign({...baseSettings, backgroundColor: '#333', postTitleColor: 'invalid'}).postTitleColor,
                '#ffffff'
            );
            assertColorsEqual(
                getEmailDesign({...baseSettings, backgroundColor: '#ddd', postTitleColor: 'invalid'}).postTitleColor,
                '#000000'
            );
        });
    });

    describe('sectionTitleColor', function () {
        it('returns the accent color when section title color is set to "accent"', function () {
            const result = getEmailDesign({...baseSettings, accentColor: '#f00', sectionTitleColor: 'accent'});
            assertColorsEqual(result.sectionTitleColor, '#f00');
        });

        it('returns the default accent color when the section title color is set to "accent" but the accent color is invalid', function () {
            const result = getEmailDesign({...baseSettings, accentColor: 'invalid', sectionTitleColor: 'accent'});
            assertColorsEqual(result.sectionTitleColor, '#15212a');
        });

        it('returns the provided section title color when input is valid', function () {
            for (const sectionTitleColor of VALID_HEX_COLORS) {
                const result = getEmailDesign({...baseSettings, sectionTitleColor});
                assertColorsEqual(result.sectionTitleColor, sectionTitleColor);
            }
        });

        it('returns null when input is invalid', function () {
            for (const sectionTitleColor of INVALID_HEX_COLORS.filter(color => color !== 'accent')) {
                const result = getEmailDesign({...baseSettings, sectionTitleColor});
                assert.equal(result.sectionTitleColor, null);
            }
        });
    });

    describe('textColor', function () {
        it('returns white for dark background colors', function () {
            const result = getEmailDesign({...baseSettings, backgroundColor: '#333'});
            assertColorsEqual(result.textColor, '#ffffff');
        });

        it('returns black for light or invalid background colors', function () {
            const result = getEmailDesign({...baseSettings, backgroundColor: '#ddd'});
            assertColorsEqual(result.textColor, '#000000');
        });

        it('returns black for invalid background colors', function () {
            for (const backgroundColor of INVALID_HEX_COLORS) {
                const result = getEmailDesign({...baseSettings, backgroundColor});
                assertColorsEqual(result.textColor, '#000000');
            }
        });
    });

    describe('titleFontWeight', function () {
        it('returns the provided title font weight when input is a string', function () {
            for (const titleFontWeight of ['normal', 'medium', 'semibold', 'bold', 'foo']) {
                const result = getEmailDesign({...baseSettings, titleFontWeight});
                assert.equal(result.titleFontWeight, titleFontWeight);
            }
        });

        it('returns null when input is not a string', function () {
            for (const titleFontWeight of [null, undefined, 400, ['bold']]) {
                const result = getEmailDesign({...baseSettings, titleFontWeight});
                assert.equal(result.titleFontWeight, null);
            }
        });
    });

    describe('titleStrongWeight', function () {
        it('returns 700 when title weight is less than that', function () {
            for (const titleFontWeight of ['normal', 'medium', 'semibold']) {
                const result = getEmailDesign({...baseSettings, titleFontWeight});
                assert.equal(result.titleStrongWeight, '700');
            }
        });

        it('returns 800 when title weight is bold', function () {
            const result = getEmailDesign({...baseSettings, titleFontWeight: 'bold'});
            assert.equal(result.titleStrongWeight, '800');
        });

        it('returns 800 when title weight is invalid', function () {
            for (const titleFontWeight of [null, undefined, 400, '', 'foo', 'hasOwnProperty']) {
                const result = getEmailDesign({...baseSettings, titleFontWeight});
                assert.equal(result.titleStrongWeight, '800');
            }
        });
    });

    describe('titleWeight', function () {
        it('maps title font weight settings to numeric CSS values', function () {
            assert.equal(getEmailDesign({...baseSettings, titleFontWeight: 'normal'}).titleWeight, '400');
            assert.equal(getEmailDesign({...baseSettings, titleFontWeight: 'medium'}).titleWeight, '500');
            assert.equal(getEmailDesign({...baseSettings, titleFontWeight: 'semibold'}).titleWeight, '600');
            assert.equal(getEmailDesign({...baseSettings, titleFontWeight: 'bold'}).titleWeight, '700');
        });

        it('returns bold when no mapping exists', function () {
            for (const titleFontWeight of [null, undefined, 400, '', 'foo', 'hasOwnProperty']) {
                const result = getEmailDesign({...baseSettings, titleFontWeight});
                assert.equal(result.titleWeight, '700');
            }
        });
    });
});
