import assert from 'assert/strict';
import * as customFonts from '../src/index';

describe('Custom Fonts', function () {
    describe('getCustomFonts', function () {
        it('returns the correct custom fonts', function () {
            const fonts = customFonts.getCustomFonts();
            assert.equal(fonts, customFonts.CUSTOM_FONTS);
        });
    });

    describe('isValidCustomFont', function () {
        it('returns true for valid body fonts', function () {
            assert.equal(customFonts.isValidCustomFont('Space Grotesk'), true);
            assert.equal(customFonts.isValidCustomFont('Poppins'), true);
        });

        it('returns false for invalid fonts', function () {
            assert.equal(customFonts.isValidCustomFont('Invalid Font'), false);
        });
    });

    describe('isValidCustomHeadingFont', function () {
        it('returns true for valid heading fonts', function () {
            assert.equal(customFonts.isValidCustomHeadingFont('Space Grotesk'), true);
            assert.equal(customFonts.isValidCustomHeadingFont('Playfair Display'), true);
        });

        it('returns false for invalid heading fonts', function () {
            assert.equal(customFonts.isValidCustomHeadingFont('Invalid Font'), false);
            assert.equal(customFonts.isValidCustomHeadingFont('Poppins'), false);
        });
    });

    describe('generateCustomFontCss', function () {
        it('returns correct CSS for single font', function () {
            const result = customFonts.generateCustomFontCss({body: 'Space Grotesk'});

            assert.equal(result.includes('@import url(https://fonts.bunny.net/css?family=space-grotesk:700);'), true, 'Includes the correct import for the body font');
            assert.equal(result.includes('.is-body {font-family: Space Grotesk !important;}'), true, 'Includes the correct CSS for the body font');
            assert.equal(result.includes('.is-title, .gh-content [id]'), false, 'Does not include CSS for the title font');
        });

        it('returns correct CSS for different heading and body fonts', function () {
            const result = customFonts.generateCustomFontCss({heading: 'Playfair Display', body: 'Poppins'});

            assert.equal(result.includes('@import url(https://fonts.bunny.net/css?family=playfair-display:400);'), true, 'Includes the correct import for the heading font');
            assert.equal(result.includes('@import url(https://fonts.bunny.net/css?family=poppins:400,700);'), true, 'Includes the correct import for the body font');
            assert.equal(result.includes('.is-title, .gh-content [id] {font-family: Playfair Display !important;}'), true, 'Includes the correct CSS for the heading font');
            assert.equal(result.includes('.is-body {font-family: Poppins !important;}'), true, 'Includes the correct CSS for the body font');
        });

        it('returns correct CSS with only one import for equal heading and body fonts', function () {
            const result = customFonts.generateCustomFontCss({heading: 'Chakra Petch', body: 'Chakra Petch'});

            assert.equal(result, '<style>@import url(https://fonts.bunny.net/css?family=chakra-petch:400);.is-body {font-family: Chakra Petch !important;}.is-title, .gh-content [id] {font-family: Chakra Petch !important;}</style>', 'Includes the correct CSS with only one import for equal heading and body fonts');
        });
    });
});
