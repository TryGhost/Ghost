import * as assert from 'assert/strict';
import {GenerateCodeOptions, generateCode} from '../../../src/utils/generateEmbedCode';

describe('generateCode', function () {
    let genOptions: GenerateCodeOptions;

    beforeEach(function () {
        genOptions = {
            preview: false,
            config: {
                blogUrl: 'https://example.com',
                signupForm: {
                    url: 'https://example.com',
                    version: 'v3'
                }
            },
            settings: {
                accentColor: '#000000'
            },
            labels: [],
            backgroundColor: '#000000',
            layout: 'minimal',
            i18nEnabled: false
        };
    });

    it('generates a basic embed script', function () {
        assert.equal(generateCode(genOptions), '<div style="min-height: 58px;max-width: 440px;margin: 0 auto;width: 100%"><script src="https://example.com" data-button-color="#000000" data-button-text-color="#FFFFFF" data-site="https://example.com" async></script></div>');
    });

    it('generates a basic embed script with i18n', function () {
        genOptions.i18nEnabled = true;
        genOptions.settings.locale = 'af';
        assert.equal(generateCode(genOptions), '<div style="min-height: 58px;max-width: 440px;margin: 0 auto;width: 100%"><script src="https://example.com" data-button-color="#000000" data-button-text-color="#FFFFFF" data-site="https://example.com" data-locale="af" async></script></div>');
    });

    it('generates a basic embed script with labels', function () {
        genOptions.labels = [{name: 'label1'}, {name: 'label2'}];
        assert.equal(generateCode(genOptions), '<div style="min-height: 58px;max-width: 440px;margin: 0 auto;width: 100%"><script src="https://example.com" data-label-1="label1" data-label-2="label2" data-button-color="#000000" data-button-text-color="#FFFFFF" data-site="https://example.com" async></script></div>');
    });

    it('generated an embed with an icon', function () {
        genOptions.settings.icon = 'https://example.com/content/images/size/w256h256/2023/09/snoopy.png';
        genOptions.layout = 'all-in-one';
        assert.equal(generateCode(genOptions), '<div style="height: 40vmin;min-height: 360px"><script src="https://example.com" data-background-color="#000000" data-text-color="#FFFFFF" data-button-color="#000000" data-button-text-color="#FFFFFF" data-title="" data-description="" data-icon="https://example.com/content/images/size/w192h192/size/w256h256/2023/09/snoopy.png" data-site="https://example.com" async></script></div>');
    });

    it('renders a full preview', function () {
        genOptions.preview = true;
        genOptions.layout = 'all-in-one';
        assert.equal(generateCode(genOptions), '<div style="height: 100vh"><script src="https://example.com" data-background-color="#000000" data-text-color="#FFFFFF" data-button-color="#000000" data-button-text-color="#FFFFFF" data-title="" data-description="" data-site="https://example.com" async></script></div>');
    });

    it('renders a preview with a minimal layout', function () {
        genOptions.preview = true;
        genOptions.layout = 'minimal';
        assert.equal(generateCode(genOptions), '<div style="position: absolute; z-index: -1; top: 0; left: 0; width: 100%; height: 100%; background-image: linear-gradient(45deg, #eee 25%, transparent 25%, transparent 75%, #eee 75%), linear-gradient(45deg, #eee 25%, transparent 25%, transparent 75%, #eee 75%);background-size: 16px 16px;background-position: 0 0, 8px 8px;;"></div><div style="min-height: 58px; max-width: 440px;width: 100%;position: absolute; left: 50%; top:50%; transform: translate(-50%, -50%);"><script src="https://example.com" data-button-color="#000000" data-button-text-color="#FFFFFF" data-site="https://example.com" async></script></div>');
    });

    it('generates text color based on background color - light background, black text', function () {
        genOptions.backgroundColor = '#ffffff';
        genOptions.layout = 'all-in-one';
        assert.equal(generateCode(genOptions), '<div style="height: 40vmin;min-height: 360px"><script src="https://example.com" data-background-color="#ffffff" data-text-color="#000000" data-button-color="#000000" data-button-text-color="#FFFFFF" data-title="" data-description="" data-site="https://example.com" async></script></div>');
    });

    it('generates text color based on background color - black background, light text', function () {
        genOptions.backgroundColor = '#000000';
        genOptions.layout = 'all-in-one';
        assert.equal(generateCode(genOptions), '<div style="height: 40vmin;min-height: 360px"><script src="https://example.com" data-background-color="#000000" data-text-color="#FFFFFF" data-button-color="#000000" data-button-text-color="#FFFFFF" data-title="" data-description="" data-site="https://example.com" async></script></div>');
    });
});
