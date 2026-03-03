import * as assert from 'assert/strict';
import {mapFontWeightForCategory, resolveAutomationPreviewColors, resolveNewsletterPreviewColors} from '@src/components/settings/email/customization/design/helpers';

describe('design helpers', function () {
    it('maps unsupported serif weights to valid serif weights', function () {
        assert.equal(mapFontWeightForCategory('serif', 'semibold'), 'bold');
        assert.equal(mapFontWeightForCategory('serif', 'medium'), 'normal');
    });

    it('keeps supported sans-serif weights unchanged', function () {
        assert.equal(mapFontWeightForCategory('sans_serif', 'medium'), 'medium');
        assert.equal(mapFontWeightForCategory('sans_serif', 'bold'), 'bold');
    });

    it('resolves accent and auto newsletter preview colors', function () {
        const colors = resolveNewsletterPreviewColors({
            accentColor: '#f56500',
            backgroundColorValue: 'light',
            headerBackgroundColorValue: 'transparent',
            postTitleColorValue: 'accent',
            sectionTitleColorValue: null,
            buttonColorValue: null,
            linkColorValue: 'accent',
            dividerColorValue: null
        });

        assert.equal(colors.backgroundColor, '#ffffff');
        assert.equal(colors.postTitleColor, '#f56500');
        assert.equal(colors.linkColor, '#f56500');
        assert.equal(colors.dividerColor, '#e0e7eb');
    });

    it('resolves automation heading colors from section title color', function () {
        const colors = resolveAutomationPreviewColors({
            accentColor: '#f56500',
            backgroundColorValue: 'light',
            headerBackgroundColorValue: 'transparent',
            sectionTitleColorValue: '#112233',
            buttonColorValue: 'accent',
            linkColorValue: 'accent',
            dividerColorValue: null
        });

        assert.equal(colors.headingColor, '#112233');
    });
});
