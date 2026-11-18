import assert from 'node:assert/strict';
import {renderEmailButton} from '../../../src/utils/render-helpers/email-button.js';
import {createDocument} from '../../test-utils/index.js';

// The Ghost-side tests exercised private helpers (_getOptions, _getTextColor,
// _getButtonClasses, _getButtonStyle, _getLinkStyle) which are not exported
// here. The same behaviours are covered below via renderEmailButton output.
describe('utils/render-helpers/email-button', function () {
    // Values containing characters that are special in HTML
    const badText = 'Go <b>now</b> & "save"';
    const badUrl = 'https://example.org/a"b>c?x=1&y=<2>';

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

        it('renders a url and text containing special characters', function () {
            const result = renderEmailButton({url: badUrl, text: badText});
            const document = createDocument(result);
            const link = document.querySelector('a');

            assert.deepEqual(link?.getAttributeNames(), ['href']);
            assert.equal(link?.getAttribute('href'), badUrl);
            assert.equal(link?.textContent, badText);
            assert.equal(link?.children.length, 0);
        });

        it('writes the text as text, rendering HTML entities as their characters', function () {
            const result = renderEmailButton({url: 'http://example.com', text: 'Subscribe &rarr;'});

            assert.equal(createDocument(result).querySelector('a')?.textContent, 'Subscribe →');
        });

        it('renders alignment and button width attributes', function () {
            const result = renderEmailButton({alignment: 'center', buttonWidth: '200'});
            assert.ok(result.includes(' align="center">'));
            assert.ok(result.includes('<td align="center" width="200">'));
        });

        it('renders alignment and button width containing special characters', function () {
            const badAlignment = 'center" x="<y>';
            const badWidth = '200" x="<y>';
            const result = renderEmailButton({alignment: badAlignment, buttonWidth: badWidth});
            const document = createDocument(result);
            const table = document.querySelector('table');
            const cell = document.querySelector('td');

            assert.equal(document.body.children.length, 1);
            assert.deepEqual(table?.getAttributeNames(), ['class', 'border', 'cellspacing', 'cellpadding', 'align']);
            assert.equal(table?.getAttribute('align'), badAlignment);
            assert.deepEqual(cell?.getAttributeNames(), ['align', 'width']);
            assert.equal(cell?.getAttribute('width'), badWidth);
        });

        it('ignores a colour that isn\'t in a supported format', function () {
            for (const badColor of ['red; width: 100%', '#fff" x="', 'red>']) {
                for (const style of ['fill', 'outline'] as const) {
                    const result = renderEmailButton({url: 'http://example.com', text: 'Click me', color: badColor, style});
                    const document = createDocument(result);

                    assert.equal(document.querySelector('table')?.getAttribute('class'), 'btn', badColor);
                    assert.deepEqual(document.querySelector('td')?.getAttributeNames(), ['align'], badColor);
                    assert.deepEqual(document.querySelector('a')?.getAttributeNames(), ['href'], badColor);
                }
            }
        });

        it('renders rgb() and hsl() colours', function () {
            const fill = createDocument(renderEmailButton({color: 'rgb(34, 34, 34)', style: 'fill'})).querySelector('td') as HTMLElement;
            const outline = createDocument(renderEmailButton({color: 'hsl(0 0% 13%)', style: 'outline'})).querySelector('td') as HTMLElement;

            assert.equal(fill.getAttribute('style'), 'background-color: rgb(34, 34, 34);');
            assert.equal(outline.getAttribute('style'), 'color: hsl(0 0% 13%) !important; border: 1px solid hsl(0 0% 13%); border-color: currentColor; background-color: transparent;');
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
