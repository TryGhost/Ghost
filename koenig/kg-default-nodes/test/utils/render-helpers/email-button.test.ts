import assert from 'node:assert/strict';
import {renderEmailButton} from '../../../src/utils/render-helpers/email-button.js';

// The Ghost-side tests exercised private helpers (_getOptions, _getTextColor,
// _getButtonClasses, _getButtonStyle, _getLinkStyle) which are not exported
// here. The same behaviours are covered below via renderEmailButton output.
describe('utils/render-helpers/email-button', function () {
    describe('renderEmailButton', function () {
        it('renders with default options when no options are provided', function () {
            const result = renderEmailButton();
            assert.equal(result, '<table class="btn" border="0" cellspacing="0" cellpadding="0"><tbody><tr><td align="center"><a href=""></a></td></tr></tbody></table>');
        });

        it('does not override default options when given undefined', function () {
            const result = renderEmailButton({url: 'http://example.com', text: 'Click me', style: undefined});
            assert.equal(result, renderEmailButton({url: 'http://example.com', text: 'Click me', style: 'fill'}));
        });

        it('renders url and text', function () {
            const result = renderEmailButton({url: 'http://example.com', text: 'Click me'});
            assert.ok(result.includes('<a href="http://example.com">Click me</a>'));
        });

        it('renders alignment and button width attributes', function () {
            const result = renderEmailButton({alignment: 'center', buttonWidth: '200'});
            assert.ok(result.includes(' align="center">'));
            assert.ok(result.includes('<td align="center" width="200">'));
        });

        it('renders btn-accent class for accent color', function () {
            const result = renderEmailButton({color: 'accent'});
            assert.ok(result.includes('class="btn btn-accent"'));
        });

        it('renders no custom styles for filled accent button', function () {
            const result = renderEmailButton({color: 'accent', style: 'fill'});
            assert.ok(!result.includes('style='));
        });

        it('renders no custom styles for outline accent button', function () {
            const result = renderEmailButton({color: 'accent', style: 'outline'});
            assert.ok(!result.includes('style='));
        });

        it('renders expected styles for filled custom color button', function () {
            // dark background, white text
            const result = renderEmailButton({color: '#222222', style: 'fill'});
            assert.ok(result.includes('<td align="center" style="background-color: #222222;">'));
            assert.ok(result.includes('<a href="" style="color: #FFFFFF !important;">'));
        });

        it('renders black text for light colored fill', function () {
            const result = renderEmailButton({color: '#dddddd', style: 'fill'});
            assert.ok(result.includes('<a href="" style="color: #000000 !important;">'));
        });

        it('renders expected styles for outline custom color button', function () {
            const result = renderEmailButton({color: '#222222', style: 'outline'});
            assert.ok(result.includes('<td align="center" style="color: #222222 !important; border: 1px solid #222222; border-color: currentColor; background-color: transparent;">'));
            assert.ok(result.includes('<a href="" style="color: #222222 !important;">'));
        });

        it('renders no text color style for invalid hex colors', function () {
            const result = renderEmailButton({color: 'invalid', style: 'fill'});
            assert.ok(result.includes('<a href="">'));
        });
    });
});
