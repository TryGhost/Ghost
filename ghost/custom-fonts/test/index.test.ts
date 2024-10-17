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
            assert.equal(customFonts.isValidCustomHeadingFont('Playfair Display'), true);
        });

        it('returns false for invalid heading fonts', function () {
            assert.equal(customFonts.isValidCustomHeadingFont('Invalid Font'), false);
            assert.equal(customFonts.isValidCustomHeadingFont('Comic Sans'), false);
        });
    });

    describe('generateCustomFontCss', function () {
        it('returns correct CSS for single font', function () {
            const result = customFonts.generateCustomFontCss({body: 'Noto Sans'});

            assert.equal(result.includes('@import url(https://fonts.bunny.net/css?family=noto-sans:400,700);'), true, 'Includes the correct import for the body font');
            assert.equal(result.includes('.gh-body-font {font-family: Noto Sans; font-size-adjust: none;}'), true, 'Includes the correct CSS for the body font');
            assert.equal(result.includes('.gh-heading-font, .gh-content :is(h1,h2,h3,h4,h5,h6)[id]'), false, 'Does not include CSS for the title font');
        });

        it('returns correct CSS for different heading and body fonts', function () {
            const result = customFonts.generateCustomFontCss({heading: 'Playfair Display', body: 'Poppins'});

            assert.equal(result.includes('@import url(https://fonts.bunny.net/css?family=playfair-display:400);'), true, 'Includes the correct import for the heading font');
            assert.equal(result.includes('@import url(https://fonts.bunny.net/css?family=poppins:400,500,600);'), true, 'Includes the correct import for the body font');
            assert.equal(result.includes('.gh-heading-font, .gh-content :is(h1,h2,h3,h4,h5,h6)[id] {font-family: Playfair Display; font-size-adjust: none;}'), true, 'Includes the correct CSS for the heading font');
            assert.equal(result.includes('.gh-body-font {font-family: Poppins; font-size-adjust: none;}'), true, 'Includes the correct CSS for the body font');
        });

        it('returns correct CSS with only one import for equal heading and body fonts', function () {
            const result = customFonts.generateCustomFontCss({heading: 'Lora', body: 'Lora'});

            assert.equal(result, '<style>@import url(https://fonts.bunny.net/css?family=lora:400,700);.gh-body-font {font-family: Lora; font-size-adjust: none;}.gh-heading-font, .gh-content :is(h1,h2,h3,h4,h5,h6)[id] {font-family: Lora; font-size-adjust: none;}</style>', 'Includes the correct CSS with only one import for equal heading and body fonts');
        });
    });
});
