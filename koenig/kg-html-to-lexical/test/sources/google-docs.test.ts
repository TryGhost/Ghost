import assert from 'assert/strict';
const converter = require('../../');

const editorConfig = {
    onError(e: Error) {
        throw e;
    }
};

const wrapperMap = {
    normal: {
        tag: 'p',
        style: 'line-height: 1.38; margin-top: 0pt; margin-bottom: 0pt'
    }
};

// This function does not suppose to do anything, it's only used as a trigger
// for auto-formatting and syntax highlighting in vscode.
export function html(strings: TemplateStringsArray, ...params: any[]) {
    let output = '';
    for (let i = 0; i < strings.length; i++) {
        output += strings[i];
        if (i < strings.length - 1) {
            output += params[i];
        }
    }
    return output;
}

function googleHtml(input: string, type: keyof typeof wrapperMap): string {
    const {tag, style} = wrapperMap[type];

    return `<b style="font-weight: normal" id="docs-internal-guid-7898193f-7fff-3086-7f10-dc328c4061a8"><${tag} dir="ltr" style="${style}">${input}</${tag}></b>`;
}

describe('HTMLtoLexical: Google Docs', function () {
    it('can convert plain text', function () {
        const input = googleHtml('<span style="font-size: 11pt; font-family: Arial, sans-serif; color: #000000; background-color: transparent; font-weight: 400; font-style: normal; font-variant: normal; text-decoration: none; vertical-align: baseline; white-space: pre; white-space: pre-wrap;">Plain</span>', 'normal');
        const lexical = converter.htmlToLexical(input, editorConfig);

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
        const input = googleHtml('<span style="font-size: 11pt; font-family: Arial, sans-serif; color: #000000; background-color: transparent; font-weight: 700; font-style: normal; font-variant: normal; text-decoration: none; vertical-align: baseline; white-space: pre; white-space: pre-wrap;">Bold</span>', 'normal');
        const lexical = converter.htmlToLexical(input, editorConfig);

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
        const input = googleHtml('<span style="font-size: 11pt; font-family: Arial, sans-serif; color: #000000; background-color: transparent; font-weight: 400; font-style: italic; font-variant: normal; text-decoration: none; vertical-align: baseline; white-space: pre; white-space: pre-wrap;">Italic</span>', 'normal');
        const lexical = converter.htmlToLexical(input, editorConfig);

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
        const input = googleHtml('<span style="font-size: 11pt; font-family: Arial, sans-serif; color: #000000; background-color: transparent; font-weight: 700; font-style: italic; font-variant: normal; text-decoration: none; vertical-align: baseline; white-space: pre; white-space: pre-wrap;">Bold+Italic</span>', 'normal');
        const lexical = converter.htmlToLexical(input, editorConfig);

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
        const input = googleHtml('<span style="font-size: 11pt; font-family: Arial, sans-serif; color: #000000; background-color: transparent; font-weight: 400; font-style: normal; font-variant: normal; text-decoration: underline; -webkit-text-decoration-skip: none; text-decoration-skip-ink: none; vertical-align: baseline; white-space: pre; white-space: pre-wrap;">Underline</span>', 'normal');
        const lexical = converter.htmlToLexical(input, editorConfig);

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
        const input = googleHtml('<span style="font-size: 11pt; font-family: Arial, sans-serif; color: #000000; background-color: transparent; font-weight: 400; font-style: italic; font-variant: normal; text-decoration: underline; -webkit-text-decoration-skip: none; text-decoration-skip-ink: none; vertical-align: baseline; white-space: pre; white-space: pre-wrap;">Italic+Underline</span>', 'normal');
        const lexical = converter.htmlToLexical(input, editorConfig);

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

    it('removes extra empty paragraphs', function () {
        const input = html`
            <b style="font-weight:normal;" id="docs-internal-guid-c78cbc4e-7fff-3259-7cfe-a58c824763cf">
                <p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;">
                    <span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Here is the start of an article</span>
                </p>
                <br />
                <p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;">
                    <span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Here is the next paragraph with an extra line break since you need to do that in Google docs.</span>
                </p>
                <p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;">
                    <span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Here is a paragraph without an extra line break.</span>
                </p>
            </b>
            <br class="Apple-interchange-newline">
        `;

        const lexical = converter.htmlToLexical(input, editorConfig);

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
                                text: 'Here is the start of an article',
                                type: 'extended-text',
                                version: 1
                            }
                        ],
                        direction: null,
                        format: '',
                        indent: 0,
                        type: 'paragraph',
                        version: 1
                    },
                    {
                        children: [
                            {
                                detail: 0,
                                format: 0,
                                mode: 'normal',
                                style: '',
                                text: 'Here is the next paragraph with an extra line break since you need to do that in Google docs.',
                                type: 'extended-text',
                                version: 1
                            }
                        ],
                        direction: null,
                        format: '',
                        indent: 0,
                        type: 'paragraph',
                        version: 1
                    },
                    {
                        children: [
                            {
                                detail: 0,
                                format: 0,
                                mode: 'normal',
                                style: '',
                                text: 'Here is a paragraph without an extra line break.',
                                type: 'extended-text',
                                version: 1
                            }
                        ],
                        direction: null,
                        format: '',
                        indent: 0,
                        type: 'paragraph',
                        version: 1
                    },
                    {
                        children: [],
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
