const assert = require('assert');
const {lexicalToMobiledoc} = require('../');

const MOBILEDOC_VERSION = '0.3.1';
const GHOST_VERSION = '4.0';

const BLANK_DOC = {
    version: MOBILEDOC_VERSION,
    ghostVersion: GHOST_VERSION,
    markups: [],
    atoms: [],
    cards: [],
    sections: [
        [1, 'p', [
            [0, [], 0, '']
        ]]
    ]
};

describe('lexicalToMobiledoc', function () {
    it('returns empty doc for null', function () {
        const result = lexicalToMobiledoc(null);
        assert.equal(result, JSON.stringify(BLANK_DOC));
    });

    it('returns empty doc for undefined', function () {
        const result = lexicalToMobiledoc(undefined);
        assert.equal(result, JSON.stringify(BLANK_DOC));
    });

    it('returns empty doc for empty string', function () {
        const result = lexicalToMobiledoc('');
        assert.equal(result, JSON.stringify(BLANK_DOC));
    });

    describe('rich-text', function () {
        it('converts a single blank paragraph', function () {
            const result = lexicalToMobiledoc(JSON.stringify({
                root: {
                    children: [
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
            }));

            assert.equal(result, JSON.stringify({
                version: MOBILEDOC_VERSION,
                ghostVersion: GHOST_VERSION,
                atoms: [],
                cards: [],
                markups: [],
                sections: [
                    [1, 'p', [
                        [0, [], 0, '']
                    ]]
                ]
            }));
        });

        it('converts a single populated paragraph', function () {
            const result = lexicalToMobiledoc(JSON.stringify({
                root: {
                    children: [
                        {
                            children: [
                                {
                                    detail: 0,
                                    format: 0,
                                    mode: 'normal',
                                    style: '',
                                    text: 'Hello, world!',
                                    type: 'text',
                                    version: 1
                                }
                            ],
                            direction: 'ltr',
                            format: '',
                            indent: 0,
                            type: 'paragraph',
                            version: 1
                        }
                    ],
                    direction: 'ltr',
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            }));

            assert.equal(result, JSON.stringify({
                version: MOBILEDOC_VERSION,
                ghostVersion: GHOST_VERSION,
                atoms: [],
                cards: [],
                markups: [],
                sections: [
                    [1, 'p', [
                        [0, [], 0, 'Hello, world!']
                    ]]
                ]
            }));
        });

        it('converts multiple paragraphs', function () {
            const result = lexicalToMobiledoc(JSON.stringify({
                root: {
                    children: [
                        {
                            children: [
                                {
                                    detail: 0,
                                    format: 0,
                                    mode: 'normal',
                                    style: '',
                                    text: 'Hello, world!',
                                    type: 'text',
                                    version: 1
                                }
                            ],
                            direction: 'ltr',
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
                                    text: 'It\'s a wonderful day!',
                                    type: 'text',
                                    version: 1
                                }
                            ],
                            direction: 'ltr',
                            format: '',
                            indent: 0,
                            type: 'paragraph',
                            version: 1
                        }
                    ],
                    direction: 'ltr',
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            }));

            assert.equal(result, JSON.stringify({
                version: MOBILEDOC_VERSION,
                ghostVersion: GHOST_VERSION,
                atoms: [],
                cards: [],
                markups: [],
                sections: [
                    [1, 'p', [
                        [0, [], 0, 'Hello, world!']
                    ]],
                    [1, 'p', [
                        [0, [], 0, 'It\'s a wonderful day!']
                    ]]
                ]
            }));
        });

        it('converts a paragraph with strong text', function () {
            const result = lexicalToMobiledoc(JSON.stringify({
                root: {
                    children: [
                        {
                            children: [
                                {
                                    detail: 0,
                                    format: 0,
                                    mode: 'normal',
                                    style: '',
                                    text: 'Hello, ',
                                    type: 'text',
                                    version: 1
                                },
                                {
                                    detail: 0,
                                    format: 1,
                                    mode: 'normal',
                                    style: '',
                                    text: 'world',
                                    type: 'text',
                                    version: 1
                                },
                                {
                                    detail: 0,
                                    format: 0,
                                    mode: 'normal',
                                    style: '',
                                    text: '!',
                                    type: 'text',
                                    version: 1
                                }
                            ],
                            direction: 'ltr',
                            format: '',
                            indent: 0,
                            type: 'paragraph',
                            version: 1
                        }
                    ],
                    direction: 'ltr',
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            }));

            assert.equal(result, JSON.stringify({
                version: MOBILEDOC_VERSION,
                ghostVersion: GHOST_VERSION,
                atoms: [],
                cards: [],
                markups: [
                    ['strong']
                ],
                sections: [
                    [1, 'p', [
                        [0, [], 0, 'Hello, '],
                        [0, [0], 1, 'world'],
                        [0, [], 0, '!']
                    ]]
                ]
            }));
        });

        // lexical only supports em, not i
        it('converts a paragraph with italic/emphasis text', function () {
            const result = lexicalToMobiledoc(JSON.stringify({
                root: {
                    children: [
                        {
                            children: [
                                {
                                    detail: 0,
                                    format: 0,
                                    mode: 'normal',
                                    style: '',
                                    text: 'Hello, ',
                                    type: 'text',
                                    version: 1
                                },
                                {
                                    detail: 0,
                                    format: 2,
                                    mode: 'normal',
                                    style: '',
                                    text: 'world',
                                    type: 'text',
                                    version: 1
                                },
                                {
                                    detail: 0,
                                    format: 0,
                                    mode: 'normal',
                                    style: '',
                                    text: '!',
                                    type: 'text',
                                    version: 1
                                }
                            ],
                            direction: 'ltr',
                            format: '',
                            indent: 0,
                            type: 'paragraph',
                            version: 1
                        }
                    ],
                    direction: 'ltr',
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            }));

            assert.equal(result, JSON.stringify({
                version: MOBILEDOC_VERSION,
                ghostVersion: GHOST_VERSION,
                atoms: [],
                cards: [],
                markups: [
                    ['em']
                ],
                sections: [
                    [1, 'p', [
                        [0, [], 0, 'Hello, '],
                        [0, [0], 1, 'world'],
                        [0, [], 0, '!']
                    ]]
                ]
            }));
        });

        it('converts a paragraph with strong and italic text', function () {
            const result = lexicalToMobiledoc(JSON.stringify({
                root: {
                    children: [
                        {
                            children: [
                                {
                                    detail: 0,
                                    format: 1,
                                    mode: 'normal',
                                    style: '',
                                    text: 'Hello, ',
                                    type: 'text',
                                    version: 1
                                },
                                {
                                    detail: 0,
                                    format: 3,
                                    mode: 'normal',
                                    style: '',
                                    text: 'world',
                                    type: 'text',
                                    version: 1
                                },
                                {
                                    detail: 0,
                                    format: 1,
                                    mode: 'normal',
                                    style: '',
                                    text: '!',
                                    type: 'text',
                                    version: 1
                                }
                            ],
                            direction: 'ltr',
                            format: '',
                            indent: 0,
                            type: 'paragraph',
                            version: 1
                        }
                    ],
                    direction: 'ltr',
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            }));

            assert.equal(result, JSON.stringify({
                version: MOBILEDOC_VERSION,
                ghostVersion: GHOST_VERSION,
                atoms: [],
                cards: [],
                markups: [
                    ['strong'],
                    ['em']
                ],
                sections: [
                    [1, 'p', [
                        [0, [0], 0, 'Hello, '],
                        [0, [1], 1, 'world'],
                        [0, [], 1, '!']
                    ]]
                ]
            }));
        });

        // ensure opening and closing markups are handled correctly
        it('converts "Plain. Bold, bold+italic, italic. Plain."', function () {
            const result = lexicalToMobiledoc(JSON.stringify({
                root: {
                    children: [
                        {
                            children: [
                                {
                                    detail: 0,
                                    format: 0,
                                    mode: 'normal',
                                    style: '',
                                    text: 'Plain. ',
                                    type: 'text',
                                    version: 1
                                },
                                {
                                    detail: 0,
                                    format: 1,
                                    mode: 'normal',
                                    style: '',
                                    text: 'Bold, ',
                                    type: 'text',
                                    version: 1
                                },
                                {
                                    detail: 0,
                                    format: 3,
                                    mode: 'normal',
                                    style: '',
                                    text: 'bold+italic, ',
                                    type: 'text',
                                    version: 1
                                },
                                {
                                    detail: 0,
                                    format: 2,
                                    mode: 'normal',
                                    style: '',
                                    text: 'italic.',
                                    type: 'text',
                                    version: 1
                                },
                                {
                                    detail: 0,
                                    format: 0,
                                    mode: 'normal',
                                    style: '',
                                    text: ' Plain.',
                                    type: 'text',
                                    version: 1
                                }
                            ],
                            direction: 'ltr',
                            format: '',
                            indent: 0,
                            type: 'paragraph',
                            version: 1
                        }
                    ],
                    direction: 'ltr',
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            }));

            assert.equal(result, JSON.stringify({
                version: MOBILEDOC_VERSION,
                ghostVersion: GHOST_VERSION,
                atoms: [],
                cards: [],
                markups: [
                    ['strong'],
                    ['em']
                ],
                sections: [
                    [1, 'p', [
                        [0, [], 0, 'Plain. '],
                        [0, [0], 0, 'Bold, '],
                        [0, [1], 2, 'bold+italic, '], // both markups close because bold was opened first
                        [0, [1], 1, 'italic.'], // italic then has to re-open
                        [0, [], 0, ' Plain.']
                    ]]
                ]
            }));
        });

        it('converts a paragraph with code text', function () {
            const result = lexicalToMobiledoc(JSON.stringify({
                root: {
                    children: [
                        {
                            children: [
                                {
                                    detail: 0,
                                    format: 0,
                                    mode: 'normal',
                                    style: '',
                                    text: 'Hello, ',
                                    type: 'text',
                                    version: 1
                                },
                                {
                                    detail: 0,
                                    format: 16,
                                    mode: 'normal',
                                    style: '',
                                    text: 'world',
                                    type: 'text',
                                    version: 1
                                },
                                {
                                    detail: 0,
                                    format: 0,
                                    mode: 'normal',
                                    style: '',
                                    text: '!',
                                    type: 'text',
                                    version: 1
                                }
                            ],
                            direction: 'ltr',
                            format: '',
                            indent: 0,
                            type: 'paragraph',
                            version: 1
                        }
                    ],
                    direction: 'ltr',
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            }));

            assert.equal(result, JSON.stringify({
                version: MOBILEDOC_VERSION,
                ghostVersion: GHOST_VERSION,
                atoms: [],
                cards: [],
                markups: [
                    ['code']
                ],
                sections: [
                    [1, 'p', [
                        [0, [], 0, 'Hello, '],
                        [0, [0], 1, 'world'],
                        [0, [], 0, '!']
                    ]]
                ]
            }));
        });

        it('converts a paragraph with strikethrough text', function () {
            const result = lexicalToMobiledoc(JSON.stringify({
                root: {
                    children: [
                        {
                            children: [
                                {
                                    detail: 0,
                                    format: 0,
                                    mode: 'normal',
                                    style: '',
                                    text: 'Hello, ',
                                    type: 'text',
                                    version: 1
                                },
                                {
                                    detail: 0,
                                    format: 4,
                                    mode: 'normal',
                                    style: '',
                                    text: 'world',
                                    type: 'text',
                                    version: 1
                                },
                                {
                                    detail: 0,
                                    format: 0,
                                    mode: 'normal',
                                    style: '',
                                    text: '!',
                                    type: 'text',
                                    version: 1
                                }
                            ],
                            direction: 'ltr',
                            format: '',
                            indent: 0,
                            type: 'paragraph',
                            version: 1
                        }
                    ],
                    direction: 'ltr',
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            }));

            assert.equal(result, JSON.stringify({
                version: MOBILEDOC_VERSION,
                ghostVersion: GHOST_VERSION,
                atoms: [],
                cards: [],
                markups: [
                    ['s']
                ],
                sections: [
                    [1, 'p', [
                        [0, [], 0, 'Hello, '],
                        [0, [0], 1, 'world'],
                        [0, [], 0, '!']
                    ]]
                ]
            }));
        });

        it('converts a paragraph with superscript text', function () {
            const result = lexicalToMobiledoc(JSON.stringify({
                root: {
                    children: [
                        {
                            children: [
                                {
                                    detail: 0,
                                    format: 0,
                                    mode: 'normal',
                                    style: '',
                                    text: 'Hello, ',
                                    type: 'text',
                                    version: 1
                                },
                                {
                                    detail: 0,
                                    format: 64,
                                    mode: 'normal',
                                    style: '',
                                    text: 'world',
                                    type: 'text',
                                    version: 1
                                },
                                {
                                    detail: 0,
                                    format: 0,
                                    mode: 'normal',
                                    style: '',
                                    text: '!',
                                    type: 'text',
                                    version: 1
                                }
                            ],
                            direction: 'ltr',
                            format: '',
                            indent: 0,
                            type: 'paragraph',
                            version: 1
                        }
                    ],
                    direction: 'ltr',
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            }));

            assert.equal(result, JSON.stringify({
                version: MOBILEDOC_VERSION,
                ghostVersion: GHOST_VERSION,
                atoms: [],
                cards: [],
                markups: [
                    ['sup']
                ],
                sections: [
                    [1, 'p', [
                        [0, [], 0, 'Hello, '],
                        [0, [0], 1, 'world'],
                        [0, [], 0, '!']
                    ]]
                ]
            }));
        });

        it('converts a paragraph with subscript text', function () {
            const result = lexicalToMobiledoc(JSON.stringify({
                root: {
                    children: [
                        {
                            children: [
                                {
                                    detail: 0,
                                    format: 0,
                                    mode: 'normal',
                                    style: '',
                                    text: 'Hello, ',
                                    type: 'text',
                                    version: 1
                                },
                                {
                                    detail: 0,
                                    format: 32,
                                    mode: 'normal',
                                    style: '',
                                    text: 'world',
                                    type: 'text',
                                    version: 1
                                },
                                {
                                    detail: 0,
                                    format: 0,
                                    mode: 'normal',
                                    style: '',
                                    text: '!',
                                    type: 'text',
                                    version: 1
                                }
                            ],
                            direction: 'ltr',
                            format: '',
                            indent: 0,
                            type: 'paragraph',
                            version: 1
                        }
                    ],
                    direction: 'ltr',
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            }));

            assert.equal(result, JSON.stringify({
                version: MOBILEDOC_VERSION,
                ghostVersion: GHOST_VERSION,
                atoms: [],
                cards: [],
                markups: [
                    ['sub']
                ],
                sections: [
                    [1, 'p', [
                        [0, [], 0, 'Hello, '],
                        [0, [0], 1, 'world'],
                        [0, [], 0, '!']
                    ]]
                ]
            }));
        });

        it('converts a paragraph with a link');
        it('converts a paragraph with a link containing formats');
        it('converts a paragraph with line breaks');

        it('converts headings');
        it('converts headings with links and formatting');

        it('converts blockquotes');
        it('converts blockquotes with links and formatting');

        it('converts asides');
        it('converts asides with links and formatting');

        it('converts unordered lists');
        it('converts unordered lists with links and formatting');

        it('converts ordered lists');
        it('converts ordered lists with links and formatting');
    });

    describe('cards', function () {

    });
});
