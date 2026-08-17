import {JSDOM} from 'jsdom';
import {cleanBasicHtml} from '../src/clean-basic-html.js';

describe('cleanBasicHtml', function () {
    let options: {createDocument: (html: string) => Document};

    beforeAll(function () {
        options = {
            createDocument(html: string) {
                return (new JSDOM(html)).window.document;
            }
        };
    });

    it('errors in Node.js env without a `createDocument` option', function () {
        expect(function () {
            cleanBasicHtml('Test');
        }).toThrow('cleanBasicHtml() must be passed a `createDocument` function as an option when used in a non-browser environment');
    });

    it('trims all variants of whitespace', function () {
        const html = '  <br>&nbsp;&nbsp; &nbsp;';
        const result = cleanBasicHtml(html, options);

        expect(result).toBe('');
    });

    it('keeps whitespace between text', function () {
        const html = '&nbsp; <br>Testing &nbsp;Significant Whitespace<br />&nbsp;';
        const result = cleanBasicHtml(html, options);

        expect(result).toBe('Testing Significant Whitespace');
    });

    it('removes DOM elements with blank text content', function () {
        const html = '&nbsp; <p> &nbsp;&nbsp;<br></p>';
        const result = cleanBasicHtml(html, options);

        expect(result).toBe('');
    });

    it('keeps elements with text content', function () {
        const html = ' &nbsp;<strong> Test&nbsp;</strong> ';
        const result = cleanBasicHtml(html, options);

        expect(result).toBe('<strong> Test&nbsp;</strong>');
    });

    it('can extract first element content', function () {
        const html = '<p><span>Headline</span> <em>italic</em></p>';
        const result = cleanBasicHtml(html, {...options, firstChildInnerContent: true});

        expect(result).toBe('<span>Headline</span> <em>italic</em>');
    });

    it('return empty string if firstChildInnerContent option enabled and there is no first child element ', function () {
        const html = '';
        const result = cleanBasicHtml(html, {...options, firstChildInnerContent: true});

        expect(result).toBe('');
    });

    describe('options.removeCodeWrappers', function () {
        it('removes any <code> wrappers around replacement strings {foo}', function () {
            const html = '<code><span>{foo}</span></code>';
            const result = cleanBasicHtml(html, {...options, removeCodeWrappers: true});

            expect(result).toBe('<span>{foo}</span>');
        });

        it('removes any <code> wrappers around replacement strings <span>{foo}</span>', function () {
            const html = '<code><span>{foo}</span></code>';
            const result = cleanBasicHtml(html, {...options, removeCodeWrappers: true});

            expect(result).toBe('<span>{foo}</span>');
        });

        it('removes any <code> wrappers around replacement strings {foo, "default"}', function () {
            const html = '<p>Hey <code>{first_name, "there"}</code>,</p>';
            const result = cleanBasicHtml(html, {...options, removeCodeWrappers: true});

            expect(result).toBe('<p>Hey {first_name, "there"},</p>');
        });
    });
});
