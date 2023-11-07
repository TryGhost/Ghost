import assert from 'assert/strict';
const converter = require('../../');

const editorConfig = {
    onError(e: Error) {
        throw e;
    }
};

interface LexicalNode {
    type: string;
}

const wrapperMap = {
    normal: {
        tag: 'p',
        style: 'line-height: 1.38; margin-top: 0pt; margin-bottom: 0pt'
    }
};

function googleHtml(html: string, type: keyof typeof wrapperMap): string {
    const {tag, style} = wrapperMap[type];

    return `<b style="font-weight: normal" id="docs-internal-guid-7898193f-7fff-3086-7f10-dc328c4061a8"><${tag} dir="ltr" style="${style}">${html}</${tag}></b>`;
}

describe('HTMLtoLexical: Google Docs', function () {
    it('can convert plain text', function () {
        const html = googleHtml('<span style="font-size: 11pt; font-family: Arial, sans-serif; color: #000000; background-color: transparent; font-weight: 400; font-style: normal; font-variant: normal; text-decoration: none; vertical-align: baseline; white-space: pre; white-space: pre-wrap;">Plain</span>', 'normal');
        const lexical = converter.htmlToLexical(html, editorConfig);

        assert.deepEqual(lexical, {
            root: {
                children: [
                    {
                        children: [
                            {
                                detail: 0,
                                format: 0,
                                mode: 'normal',
                                style: '',
                                text: 'Plain',
                                type: 'extended-text',
                                version: 1
                            }
                        ],
                        direction: null,
                        format: '',
                        indent: 0,
                        type: 'paragraph',
                        version: 1
                    }
                ],
                direction: null,
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }
        });
    });

    it('can convert bold', function () {
        const html = googleHtml('<span style="font-size: 11pt; font-family: Arial, sans-serif; color: #000000; background-color: transparent; font-weight: 700; font-style: normal; font-variant: normal; text-decoration: none; vertical-align: baseline; white-space: pre; white-space: pre-wrap;">Bold</span>', 'normal');
        const lexical = converter.htmlToLexical(html, editorConfig);

        assert.deepEqual(lexical, {
            root: {
                children: [
                    {
                        children: [
                            {
                                detail: 0,
                                format: 1,
                                mode: 'normal',
                                style: '',
                                text: 'Bold',
                                type: 'extended-text',
                                version: 1
                            }
                        ],
                        direction: null,
                        format: '',
                        indent: 0,
                        type: 'paragraph',
                        version: 1
                    }
                ],
                direction: null,
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }
        });
    });

    it('can convert italic', function () {
        const html = googleHtml('<span style="font-size: 11pt; font-family: Arial, sans-serif; color: #000000; background-color: transparent; font-weight: 400; font-style: italic; font-variant: normal; text-decoration: none; vertical-align: baseline; white-space: pre; white-space: pre-wrap;">Italic</span>', 'normal');
        const lexical = converter.htmlToLexical(html, editorConfig);

        assert.deepEqual(lexical, {
            root: {
                children: [
                    {
                        children: [
                            {
                                detail: 0,
                                format: 2,
                                mode: 'normal',
                                style: '',
                                text: 'Italic',
                                type: 'extended-text',
                                version: 1
                            }
                        ],
                        direction: null,
                        format: '',
                        indent: 0,
                        type: 'paragraph',
                        version: 1
                    }
                ],
                direction: null,
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }
        });
    });

    it('can convert bold+italic', function () {
        const html = googleHtml('<span style="font-size: 11pt; font-family: Arial, sans-serif; color: #000000; background-color: transparent; font-weight: 700; font-style: italic; font-variant: normal; text-decoration: none; vertical-align: baseline; white-space: pre; white-space: pre-wrap;">Bold+Italic</span>', 'normal');
        const lexical = converter.htmlToLexical(html, editorConfig);

        assert.deepEqual(lexical, {
            root: {
                children: [
                    {
                        children: [
                            {
                                detail: 0,
                                format: 3,
                                mode: 'normal',
                                style: '',
                                text: 'Bold+Italic',
                                type: 'extended-text',
                                version: 1
                            }
                        ],
                        direction: null,
                        format: '',
                        indent: 0,
                        type: 'paragraph',
                        version: 1
                    }
                ],
                direction: null,
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }
        });
    });

    it('can convert underline', function () {
        const html = googleHtml('<span style="font-size: 11pt; font-family: Arial, sans-serif; color: #000000; background-color: transparent; font-weight: 400; font-style: normal; font-variant: normal; text-decoration: underline; -webkit-text-decoration-skip: none; text-decoration-skip-ink: none; vertical-align: baseline; white-space: pre; white-space: pre-wrap;">Underline</span>', 'normal');
        const lexical = converter.htmlToLexical(html, editorConfig);

        assert.deepEqual(lexical, {
            root: {
                children: [
                    {
                        children: [
                            {
                                detail: 0,
                                format: 8,
                                mode: 'normal',
                                style: '',
                                text: 'Underline',
                                type: 'extended-text',
                                version: 1
                            }
                        ],
                        direction: null,
                        format: '',
                        indent: 0,
                        type: 'paragraph',
                        version: 1
                    }
                ],
                direction: null,
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }
        });
    });

    it('can convert italic+underline', function () {
        const html = googleHtml('<span style="font-size: 11pt; font-family: Arial, sans-serif; color: #000000; background-color: transparent; font-weight: 400; font-style: italic; font-variant: normal; text-decoration: underline; -webkit-text-decoration-skip: none; text-decoration-skip-ink: none; vertical-align: baseline; white-space: pre; white-space: pre-wrap;">Italic+Underline</span>', 'normal');
        const lexical = converter.htmlToLexical(html, editorConfig);

        assert.deepEqual(lexical, {
            root: {
                children: [
                    {
                        children: [
                            {
                                detail: 0,
                                format: 10,
                                mode: 'normal',
                                style: '',
                                text: 'Italic+Underline',
                                type: 'extended-text',
                                version: 1
                            }
                        ],
                        direction: null,
                        format: '',
                        indent: 0,
                        type: 'paragraph',
                        version: 1
                    }
                ],
                direction: null,
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }
        });
    });
});
