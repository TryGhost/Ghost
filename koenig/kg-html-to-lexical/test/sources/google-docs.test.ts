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
            <b style="font-weight:normal;" id="docs-internal-guid-53c161b0-7fff-55f3-a893-721115583111">
                <p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;">
                    <span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Start of the article. Here is the 1st paragraph, followed by a line break then a paragraph.</span>
                </p>
                <br />
                <p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Here is the 2nd paragraph, followed by a linebreak then a heading.</span></p><br />
                <h1 dir="ltr" style="line-height:1.38;margin-top:20pt;margin-bottom:6pt;"><span style="font-size:20pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Heading 1</span></h1><br />
                <p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Here is the 3rd paragraph, followed by a linebreak and a list.</span></p><br />
                <ul style="margin-top:0;margin-bottom:0;padding-inline-start:48px;">
                    <li dir="ltr" style="list-style-type:disc;font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="1"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">List item 1</span></p></li>
                    <li dir="ltr" style="list-style-type:disc;font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="1"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">List item 2</span></p></li>
                </ul>
                <br />
                <p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Here is the 4th paragraph, NOT followed by linebreaks.</span></p>
                <p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Here is the 5th paragraph. End of the article.</span></p>
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
                                text: 'Start of the article. Here is the 1st paragraph, followed by a line break then a paragraph.',
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
                                text: 'Here is the 2nd paragraph, followed by a linebreak then a heading.',
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
                                text: 'Heading 1',
                                type: 'extended-text',
                                version: 1
                            }
                        ],
                        direction: null,
                        format: '',
                        indent: 0,
                        type: 'extended-heading',
                        version: 1,
                        tag: 'h1'
                    },
                    {
                        children: [
                            {
                                detail: 0,
                                format: 0,
                                mode: 'normal',
                                style: '',
                                text: 'Here is the 3rd paragraph, followed by a linebreak and a list.',
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
                                checked: undefined,
                                children: [
                                    {
                                        detail: 0,
                                        format: 0,
                                        mode: 'normal',
                                        style: '',
                                        text: 'List item 1',
                                        type: 'extended-text',
                                        version: 1
                                    }
                                ],
                                direction: null,
                                format: '',
                                indent: 0,
                                type: 'listitem',
                                version: 1,
                                value: 1
                            },
                            {
                                checked: undefined,
                                children: [
                                    {
                                        detail: 0,
                                        format: 0,
                                        mode: 'normal',
                                        style: '',
                                        text: 'List item 2',
                                        type: 'extended-text',
                                        version: 1
                                    }
                                ],
                                direction: null,
                                format: '',
                                indent: 0,
                                type: 'listitem',
                                version: 1,
                                value: 2
                            }
                        ],
                        direction: null,
                        format: '',
                        indent: 0,
                        type: 'list',
                        version: 1,
                        listType: 'bullet',
                        start: 1,
                        tag: 'ul'
                    },
                    {
                        children: [
                            {
                                detail: 0,
                                format: 0,
                                mode: 'normal',
                                style: '',
                                text: 'Here is the 4th paragraph, NOT followed by linebreaks.',
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
                                text: 'Here is the 5th paragraph. End of the article.',
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
