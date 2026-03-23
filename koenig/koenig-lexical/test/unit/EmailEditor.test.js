import {VISIBILITY_SETTINGS} from '../../src/utils/visibility';
import {expect} from 'vitest';
import {getEmailEditorCardConfig} from '../../src/components/EmailEditor';

describe('getEmailEditorCardConfig', function () {
    it('defaults to EMAIL_ONLY visibility when no cardConfig is passed', function () {
        const result = getEmailEditorCardConfig();
        expect(result.visibilitySettings).toBe(VISIBILITY_SETTINGS.EMAIL_ONLY);
    });

    it('defaults to EMAIL_ONLY visibility when cardConfig has no visibilitySettings', function () {
        const result = getEmailEditorCardConfig({stripeEnabled: true});
        expect(result.visibilitySettings).toBe(VISIBILITY_SETTINGS.EMAIL_ONLY);
    });

    it('allows NONE visibility to be passed through', function () {
        const result = getEmailEditorCardConfig({visibilitySettings: VISIBILITY_SETTINGS.NONE});
        expect(result.visibilitySettings).toBe(VISIBILITY_SETTINGS.NONE);
    });

    it('allows EMAIL_ONLY visibility to be passed through', function () {
        const result = getEmailEditorCardConfig({visibilitySettings: VISIBILITY_SETTINGS.EMAIL_ONLY});
        expect(result.visibilitySettings).toBe(VISIBILITY_SETTINGS.EMAIL_ONLY);
    });

    it('falls back to EMAIL_ONLY for WEB_AND_EMAIL', function () {
        const result = getEmailEditorCardConfig({visibilitySettings: VISIBILITY_SETTINGS.WEB_AND_EMAIL});
        expect(result.visibilitySettings).toBe(VISIBILITY_SETTINGS.EMAIL_ONLY);
    });

    it('falls back to EMAIL_ONLY for WEB_ONLY', function () {
        const result = getEmailEditorCardConfig({visibilitySettings: VISIBILITY_SETTINGS.WEB_ONLY});
        expect(result.visibilitySettings).toBe(VISIBILITY_SETTINGS.EMAIL_ONLY);
    });

    it('falls back to EMAIL_ONLY for invalid values', function () {
        const result = getEmailEditorCardConfig({visibilitySettings: 'garbage'});
        expect(result.visibilitySettings).toBe(VISIBILITY_SETTINGS.EMAIL_ONLY);
    });

    it('restricts image widths to regular only', function () {
        const result = getEmailEditorCardConfig({image: {allowedWidths: ['wide', 'full']}});
        expect(result.image.allowedWidths).toEqual(['regular']);
    });

    it('preserves other cardConfig properties', function () {
        const result = getEmailEditorCardConfig({stripeEnabled: true, foo: 'bar'});
        expect(result.stripeEnabled).toBe(true);
        expect(result.foo).toBe('bar');
    });
});
