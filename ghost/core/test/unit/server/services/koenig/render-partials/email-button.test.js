const assert = require('assert/strict');
const emailButton = require('../../../../../../core/server/services/koenig/render-partials/email-button');

describe('koenig/services/render-partials/email-button', function () {
    describe('_getOptions', function () {
        it('returns default options when no options are provided', function () {
            const result = emailButton._getOptions();
            assert.deepEqual(result, {
                url: '',
                text: '',
                alignment: '',
                buttonWidth: '',
                color: '',
                style: 'fill'
            });
        });
        it('returns merged options when options are provided', function () {
            const result = emailButton._getOptions({text: 'testing', color: 'blue'});
            assert.deepEqual(result, {
                url: '',
                text: 'testing',
                alignment: '',
                buttonWidth: '',
                color: 'blue',
                style: 'fill'
            });
        });
        it('does not override default options when given undefined', function () {
            const result = emailButton._getOptions({style: undefined});
            assert.deepEqual(result, {
                url: '',
                text: '',
                alignment: '',
                buttonWidth: '',
                color: '',
                style: 'fill'
            });
        });
    });

    describe('_getTextColor', function () {
        it('returns blank string when not a colored fill', function () {
            const result = emailButton._getTextColor({color: 'accent', style: 'outline'});
            assert.equal(result, '');
        });
        it('returns black for light colored fill', function () {
            const result = emailButton._getTextColor({color: '#dddddd', style: 'fill'});
            assert.equal(result, '#000000');
        });
        it('returns white for a dark colored fill', function () {
            const result = emailButton._getTextColor({color: '#222222', style: 'fill'});
            assert.equal(result, '#FFFFFF');
        });
        it('handles invalid hex colors', function () {
            const result = emailButton._getTextColor({color: 'invalid', style: 'fill'});
            assert.equal(result, '');
        });
    });

    describe('_getButtonClasses', function () {
        it('returns btn class', function () {
            const result = emailButton._getButtonClasses({color: '#ffffff'});
            assert.equal(result, 'btn');
        });
        it('returns btn-accent class for accent color', function () {
            const result = emailButton._getButtonClasses({color: 'accent'});
            assert.equal(result, 'btn btn-accent');
        });
    });

    describe('_getButtonStyle', function () {
        it('returns blank string for filled accent button', function () {
            const result = emailButton._getButtonStyle({color: 'accent', style: 'fill'});
            assert.equal(result, '');
        });
        it('returns blank string for outline accent button', function () {
            const result = emailButton._getButtonStyle({color: 'accent', style: 'outline'});
            assert.equal(result, '');
        });
        it('returns expected style for filled custom color button', function () {
            const result = emailButton._getButtonStyle({color: '#222222', style: 'fill'});
            assert.equal(result, 'background-color: #222222;');
        });
        it('returns expected style for outline custom color button', function () {
            const result = emailButton._getButtonStyle({color: '#222222', style: 'outline'});
            assert.equal(result, 'color: #222222 !important; border: 1px solid #222222; border-color: currentColor; background-color: transparent;');
        });
    });

    describe('_getLinkStyle', function () {
        it('returns blank string for filled accent button', function () {
            const result = emailButton._getLinkStyle({color: 'accent', style: 'fill'});
            assert.equal(result, '');
        });
        it('returns expected style for filled custom color button', function () {
            // white text on dark background
            const result = emailButton._getLinkStyle({color: '#222222', style: 'fill'});
            assert.equal(result, 'color: #FFFFFF !important;');
        });
        it('returns expected style for outline custom color button', function () {
            const result = emailButton._getLinkStyle({color: '#222222', style: 'outline'});
            assert.equal(result, 'color: #222222 !important;');
        });
    });
});