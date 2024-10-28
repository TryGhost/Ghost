import assert from 'assert/strict';
import * as customFonts from '../src/index';

describe('Custom Fonts', function () {
    describe('getCustomFonts', function () {
        it('returns the correct custom fonts', function () {
            const fonts = customFonts.getCustomFonts();
            assert.equal(fonts, customFonts.CUSTOM_FONTS);
        });
    });

    describe('getCSSFriendlyFontClassName', function () {
        it('returns the correct class name for a font', function () {
            assert.equal(customFonts.getCSSFriendlyFontClassName('Inter'), 'inter');
        });

        it('returns the correct class name for a font with a space', function () {
            assert.equal(customFonts.getCSSFriendlyFontClassName('Fira Sans'), 'fira-sans');
        });

        it('returns empty string for an invalid font', function () {
            assert.equal(customFonts.getCSSFriendlyFontClassName('Invalid Font'), '');
        });
    });

    describe('getCustomFontClassName', function () {
        it('returns the correct class name for a valid heading font', function () {
            assert.equal(customFonts.getCustomFontClassName({font: 'Space Grotesk', heading: true}), 'gh-font-heading-space-grotesk');
        });

        it('returns the correct class name for a valid body font', function () {
            assert.equal(customFonts.getCustomFontClassName({font: 'Noto Sans', heading: false}), 'gh-font-body-noto-sans');
        });

        it('returns empty string for an invalid font', function () {
            assert.equal(customFonts.getCustomFontClassName({font: 'Invalid Font', heading: true}), '');
        });
    });

    describe('isValidCustomFont', function () {
        it('returns true for valid body fonts', function () {
            assert.equal(customFonts.isValidCustomFont('Inter'), true);
            assert.equal(customFonts.isValidCustomFont('Fira Sans'), true);
        });

        it('returns false for invalid fonts', function () {
            assert.equal(customFonts.isValidCustomFont('Invalid Font'), false);
        });
    });

    describe('isValidCustomHeadingFont', function () {
        it('returns true for valid heading fonts', function () {
            assert.equal(customFonts.isValidCustomHeadingFont('Space Grotesk'), true);
            assert.equal(customFonts.isValidCustomHeadingFont('Lora'), true);
        });

        it('returns false for invalid heading fonts', function () {
            assert.equal(customFonts.isValidCustomHeadingFont('Invalid Font'), false);
            assert.equal(customFonts.isValidCustomHeadingFont('Comic Sans'), false);
        });
    });

    describe('generateCustomFontCss', function () {
        it('returns correct CSS for single font', function () {
            const result = customFonts.generateCustomFontCss({body: 'Noto Sans'});

            assert.equal(result.includes('<link rel="preconnect" href="https://fonts.bunny.net"><link rel="stylesheet" href="https://fonts.bunny.net/css?family=noto-sans:400,700">'), true, 'Includes the correct import for the body font');
            assert.equal(result.includes(':root {--gh-font-body: Noto Sans;}'), true, 'Includes the correct CSS for the body font');
            assert.equal(result.includes('--gh-font-heading'), false, 'Does not include CSS for the title font');
        });

        it('returns correct CSS for different heading and body fonts', function () {
            const result = customFonts.generateCustomFontCss({heading: 'Chakra Petch', body: 'Poppins'});

            assert.equal(result.includes('<link rel="preconnect" href="https://fonts.bunny.net"><link rel="stylesheet" href="https://fonts.bunny.net/css?family=chakra-petch:400|poppins:400,500,600">'), true, 'Includes the correct import for the heading font');
            assert.equal(result.includes(':root {--gh-font-heading: Chakra Petch;--gh-font-body: Poppins;}'), true, 'Includes the correct CSS for the body and heading fonts');
        });

        it('returns correct CSS with only one import for equal heading and body fonts', function () {
            const result = customFonts.generateCustomFontCss({heading: 'Lora', body: 'Lora'});

            assert.equal(result.includes('<link rel="preconnect" href="https://fonts.bunny.net"><link rel="stylesheet" href="https://fonts.bunny.net/css?family=lora:400,700">'), true, 'Includes the correct CSS with only one import for equal heading and body fonts');
            assert.equal(result.includes(':root {--gh-font-heading: Lora;--gh-font-body: Lora;}'), true, 'Includes the correct CSS for the body and heading fonts');
        });

        it('generates CSS when only body font is provided', function () {
            const result = customFonts.generateCustomFontCss({body: 'Noto Sans'});

            assert.equal(result.includes(':root {'), true, 'Includes :root selector when only body font is provided');
            assert.equal(result.includes('--gh-font-body: Noto Sans;'), true, 'Includes body font CSS');
            assert.equal(result.includes('--gh-font-heading'), false, 'Does not include heading font CSS when not provided');
        });

        it('generates CSS when only heading font is provided', function () {
            const result = customFonts.generateCustomFontCss({heading: 'Space Grotesk'});

            assert.equal(result.includes(':root {'), true, 'Includes :root selector when only heading font is provided');
            assert.equal(result.includes('--gh-font-heading: Space Grotesk;'), true, 'Includes heading font CSS');
            assert.equal(result.includes('--gh-font-body'), false, 'Does not include body font CSS when not provided');
        });
    });

    describe('generateCustomFontBodyClass', function () {
        it('returns the correct class for a single font', function () {
            const result = customFonts.generateCustomFontBodyClass({body: 'Noto Sans'});
            assert.equal(result, 'gh-font-body-noto-sans', 'Returns the correct class for a single font');
        });

        it('returns the correct class for different heading and body fonts', function () {
            const result = customFonts.generateCustomFontBodyClass({heading: 'JetBrains Mono', body: 'Poppins'});
            assert.equal(result, 'gh-font-heading-jetbrains-mono gh-font-body-poppins', 'Returns the correct class for different heading and body fonts');
        });

        it('returns the correct class with only a heading font', function () {
            const result = customFonts.generateCustomFontBodyClass({heading: 'Lora'});
            assert.equal(result, 'gh-font-heading-lora', 'Returns the correct class with only a heading font');
        });

        it('returns empty string with no fonts', function () {
            const result = customFonts.generateCustomFontBodyClass({});
            assert.equal(result, '', 'Returns an empty string with no fonts');
        });
    });
});
