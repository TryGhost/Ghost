import assert from 'assert/strict';
const converter = require('../');

const editorConfig = {
    onError(e: Error) {
        throw e;
    }
};

describe('HTMLtoLexical', function () {
    describe('Minimal examples', function () {
        it('can convert empty document', function () {
            const lexical = converter.htmlToLexical('', editorConfig);

            assert.deepEqual(lexical, {
                root: {
                    children: [],
                    direction: null,
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            });
        });

        it('can convert <p>Hello World</p>', function () {
            const lexical = converter.htmlToLexical('<p>Hello World</p>', editorConfig);

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
                                    text: 'Hello World',
                                    type: 'text',
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

        it('can convert <p>Hello</p><p>World</p>', function () {
            const lexical = converter.htmlToLexical('<p>Hello</p><p>World</p>', editorConfig);

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
                                    text: 'Hello',
                                    type: 'text',
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
                                    text: 'World',
                                    type: 'text',
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

    describe('Nested examples', function () {
        const helloWorldDoc = {
            root: {
                children: [
                    {
                        children: [
                            {
                                detail: 0,
                                format: 0,
                                mode: 'normal',
                                style: '',
                                text: 'Hello',
                                type: 'text',
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
                                text: 'World',
                                type: 'text',
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
        };

        it('can convert <div><p>Hello</p><p>World</p></div>', function () {
            const lexical = converter.htmlToLexical('<div><p>Hello</p><p>World</p></div>', editorConfig);
            assert.deepEqual(lexical, helloWorldDoc);
        });

        it('can convert <div><div><p>Hello</p><p>World</p></div></div>', function () {
            const lexical = converter.htmlToLexical('<div><div><p>Hello</p><p>World</p></div></div>', editorConfig);
            assert.deepEqual(lexical, helloWorldDoc);
        });

        it('can convert <div><section><p>Hello</p></section><div><p>World</p></div></div>', function () {
            const lexical = converter.htmlToLexical('<div><section><p>Hello</p></section><div><p>World</p></div></div>', editorConfig);
            assert.deepEqual(lexical, helloWorldDoc);
        });

        it('can convert <div><p>Hello</p><div><p>World</p></div></div>', function () {
            const lexical = converter.htmlToLexical('<div><p>Hello</p><div><p>World</p></div></div>', editorConfig);
            assert.deepEqual(lexical, helloWorldDoc);
        });

        it('can convert with whitespace', function () {
            const lexical = converter.htmlToLexical(`
                <div>
                    <p>Hello</p>
                    <div>
                        <p>World</p>
                    </div>
                </div>
            `, editorConfig);

            assert.deepEqual(lexical, helloWorldDoc);
        });
    });

    describe('HTML nodes', function () {
        it('can convert headings', function () {
            const lexical = converter.htmlToLexical('<h1>Hello World</h1>', editorConfig);

            assert.ok(lexical.root);
            assert.equal(lexical.root.children.length, 1);
            assert.equal(lexical.root.children[0].type, 'heading');
            assert.equal(lexical.root.children[0].tag, 'h1');
            assert.equal(lexical.root.children[0].children.length, 1);
            assert.equal(lexical.root.children[0].children[0].text, 'Hello World');
        });

        it('can convert links', function () {
            const lexical = converter.htmlToLexical('<a href="https://example.com">Hello World</a>', editorConfig);

            assert.ok(lexical.root);
            assert.equal(lexical.root.children.length, 1);
            assert.equal(lexical.root.children[0].type, 'link');
            assert.equal(lexical.root.children[0].url, 'https://example.com');
            assert.equal(lexical.root.children[0].children.length, 1);
            assert.equal(lexical.root.children[0].children[0].text, 'Hello World');
        });

        it('can convert lists', function () {
            const lexical = converter.htmlToLexical('<ul><li>Hello</li><li>World</li></ul>', editorConfig);

            assert.ok(lexical.root);
            assert.equal(lexical.root.children.length, 1);
            assert.equal(lexical.root.children[0].type, 'list');
            assert.equal(lexical.root.children[0].listType, 'bullet');
            assert.equal(lexical.root.children[0].children.length, 2);
            assert.equal(lexical.root.children[0].children[0].type, 'listitem');
            assert.equal(lexical.root.children[0].children[0].children.length, 1);
            assert.equal(lexical.root.children[0].children[0].children[0].text, 'Hello');
            assert.equal(lexical.root.children[0].children[1].type, 'listitem');
            assert.equal(lexical.root.children[0].children[1].children.length, 1);
            assert.equal(lexical.root.children[0].children[1].children[0].text, 'World');
        });

        it('can convert blockquotes', function () {
            const lexical = converter.htmlToLexical('<blockquote>Hello World</blockquote>', editorConfig);

            assert.ok(lexical.root);
            assert.equal(lexical.root.children.length, 1);
            assert.equal(lexical.root.children[0].type, 'quote');
            assert.equal(lexical.root.children[0].children.length, 1);
            assert.equal(lexical.root.children[0].children[0].text, 'Hello World');
        });
    });

    describe('Custom nodes', function () {
        it('can convert <hr> into a card', function () {
            // $insertNodes() doesn't work with just decorators, uses $appendNodes() instead
            const lexical = converter.htmlToLexical('<hr>', editorConfig);

            assert.ok(lexical.root);
            assert.equal(lexical.root.children.length, 1);
            assert.equal(lexical.root.children[0].type, 'horizontalrule');
        });

        it('can convert multiple <hr> into cards', function () {
            // $insertNodes() doesn't work with just decorators, uses $appendNodes() instead
            const lexical = converter.htmlToLexical('<hr><hr>', editorConfig);

            assert.ok(lexical.root);
            assert.equal(lexical.root.children.length, 2);
            assert.equal(lexical.root.children[0].type, 'horizontalrule');
            assert.equal(lexical.root.children[1].type, 'horizontalrule');
        });

        it('can convert <p>Hello World</p><hr> into cards', function () {
            // ensure decorators still get inserted OK after other nodes
            const lexical = converter.htmlToLexical('<p>Hello World</p><hr>', editorConfig);

            assert.ok(lexical.root);
            assert.equal(lexical.root.children.length, 2);
            assert.equal(lexical.root.children[0].type, 'paragraph');
            assert.equal(lexical.root.children[0].children.length, 1);
            assert.equal(lexical.root.children[0].children[0].text, 'Hello World');
            assert.equal(lexical.root.children[1].type, 'horizontalrule');
        });

        it('can convert <hr><p>Hello World</p> into cards', function () {
            // ensure decorators still get inserted OK before other nodes
            const lexical = converter.htmlToLexical('<hr><p>Hello World</p>', editorConfig);

            assert.ok(lexical.root);
            assert.equal(lexical.root.children.length, 2);
            assert.equal(lexical.root.children[0].type, 'horizontalrule');
            assert.equal(lexical.root.children[1].type, 'paragraph');
            assert.equal(lexical.root.children[1].children.length, 1);
            assert.equal(lexical.root.children[1].children[0].text, 'Hello World');
        });

        it('can convert alternative quote styles', function () {
            const lexical = converter.htmlToLexical('<blockquote class="kg-blockquote-alt">Hello World</blockquote>', editorConfig);

            assert.ok(lexical.root);
            assert.equal(lexical.root.children.length, 1);
            assert.equal(lexical.root.children[0].type, 'quote');
            assert.equal(lexical.root.children[0].children.length, 1);
            assert.equal(lexical.root.children[0].children[0].text, 'Hello World');
        });
    });

    describe('Unknown elements', function () {
        it('handles aside elements', function () {
            const lexical = converter.htmlToLexical('<aside>Hello World</aside>', editorConfig);

            assert.ok(lexical.root);
            assert.equal(lexical.root.children.length, 1);
            assert.equal(lexical.root.children[0].type, 'paragraph');
            assert.equal(lexical.root.children[0].children.length, 1);
            assert.equal(lexical.root.children[0].children[0].text, 'Hello World');
        });
    });
});
