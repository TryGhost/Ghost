const assert = require('assert/strict');
const {mobiledocToLexical} = require('../');

const MOBILEDOC_VERSION = '0.3.1';
const GHOST_VERSION = '4.0';

const BLANK_DOC = {
    root: {
        children: [],
        direction: null,
        format: '',
        indent: 0,
        type: 'root',
        version: 1
    }
};

describe('mobiledocToLexical', function () {
    it('returns empty doc for null', function () {
        const result = mobiledocToLexical(null);
        assert.equal(result, JSON.stringify(BLANK_DOC));
    });

    it('returns empty doc for undefined', function () {
        const result = mobiledocToLexical(undefined);
        assert.equal(result, JSON.stringify(BLANK_DOC));
    });

    it('returns empty doc for empty string', function () {
        const result = mobiledocToLexical('');
        assert.equal(result, JSON.stringify(BLANK_DOC));
    });

    describe('rich-text', function () {
        it('converts a single blank paragraph', function () {
            const result = mobiledocToLexical(JSON.stringify({
                version: MOBILEDOC_VERSION,
                atoms: [],
                cards: [],
                markups: [],
                sections: [[1,'p',[]]],
                ghostVersion: GHOST_VERSION
            }));

            assert.equal(result, JSON.stringify({
                root: {
                    children: [{
                        children: [],
                        direction: null,
                        format: '',
                        indent: 0,
                        type: 'paragraph',
                        version: 1
                    }],
                    direction: null,
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            }));
        });

        it('converts a single populated paragraph', function () {
            const result = mobiledocToLexical(JSON.stringify({
                version: MOBILEDOC_VERSION,
                atoms: [],
                cards: [],
                markups: [],
                sections: [
                    [1,'p',[[0,[],0,'This is a paragraph.']]]
                ],
                ghostVersion: GHOST_VERSION
            }));

            assert.equal(result, JSON.stringify({root: {
                children: [{
                    children: [{
                        detail: 0,
                        format: 0,
                        mode: 'normal',
                        style: '',
                        text: 'This is a paragraph.',
                        type: 'text',
                        version: 1
                    }],
                    direction: 'ltr',
                    format: '',
                    indent: 0,
                    type: 'paragraph',
                    version: 1
                }],
                direction: 'ltr',
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }}));
        });

        it('converts multiple paragraphs', function () {
            const result = mobiledocToLexical(JSON.stringify({
                version: MOBILEDOC_VERSION,
                atoms: [],
                cards: [],
                markups: [],
                sections: [
                    [1,'p',[[0,[],0,'This is a paragraph.']]],
                    [1,'p',[[0,[],0,'This is yet another one!']]]
                ],
                ghostVersion: GHOST_VERSION
            }));

            assert.equal(result, JSON.stringify({root: {
                children: [{
                    children: [{
                        detail: 0,
                        format: 0,
                        mode: 'normal',
                        style: '',
                        text: 'This is a paragraph.',
                        type: 'text',
                        version: 1
                    }],
                    direction: 'ltr',
                    format: '',
                    indent: 0,
                    type: 'paragraph',
                    version: 1
                }, {
                    children: [{
                        detail: 0,
                        format: 0,
                        mode: 'normal',
                        style: '',
                        text: 'This is yet another one!',
                        type: 'text',version: 1
                    }],
                    direction: 'ltr',
                    format: '',
                    indent: 0,
                    type: 'paragraph',
                    version: 1
                }],
                direction: 'ltr',
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }}));
        });

        it('converts a paragraph with strong text', function () {
            const result = mobiledocToLexical(JSON.stringify({
                version: MOBILEDOC_VERSION,
                atoms: [],
                cards: [],
                markups: [['strong']],
                sections: [
                    [1,'p',[[0,[],0,'Hello '],
                        [0,[0],1,'world'],
                        [0,[],0,'!']]]
                ],
                ghostVersion: GHOST_VERSION
            }));

            assert.equal(result, JSON.stringify({root: {
                children: [{
                    children: [{
                        detail: 0,
                        format: 0,
                        mode: 'normal',
                        style: '',
                        text: 'Hello ',
                        type: 'text',
                        version: 1
                    },{
                        detail: 0,
                        format: 1,
                        mode: 'normal',
                        style: '',
                        text: 'world',
                        type: 'text',
                        version: 1
                    },{
                        detail: 0,
                        format: 0,
                        mode: 'normal',
                        style: '',
                        text: '!',
                        type: 'text',
                        version: 1
                    }],
                    direction: 'ltr',
                    format: '',
                    indent: 0,
                    type: 'paragraph',
                    version: 1
                }],
                direction: 'ltr',
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }}));
        });

        it('converts a paragraph with italic/emphasis text', function () {
            const result = mobiledocToLexical(JSON.stringify({
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
            assert.equal(result, JSON.stringify({
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
        });

        it('converts a paragraph with underlined text', function () {
            const result = mobiledocToLexical(JSON.stringify({
                version: MOBILEDOC_VERSION,
                ghostVersion: GHOST_VERSION,
                atoms: [],
                cards: [],
                markups: [
                    ['u']
                ],
                sections: [
                    [1, 'p', [
                        [0, [], 0, 'Hello, '],
                        [0, [0], 1, 'world'],
                        [0, [], 0, '!']
                    ]]
                ]
            }));
            assert.equal(result, JSON.stringify({
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
                                    format: 8,
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
        });

        it('converts a paragraph with strong and italic text', function () {
            const result = mobiledocToLexical(JSON.stringify({
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

            assert.equal(result, JSON.stringify({
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
        });

        it('converts "Plain. Bold, bold+italic, italic. Plain."', function () {
            const result = mobiledocToLexical(JSON.stringify({
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

            assert.equal(result, JSON.stringify({
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
        });

        it('converts a paragraph with code text', function () {
            const result = mobiledocToLexical(JSON.stringify({
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

            assert.equal(result, JSON.stringify({
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
        });

        it('converts a paragraph with strikethrough text', function () {
            const result = mobiledocToLexical(JSON.stringify({
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

            assert.equal(result, JSON.stringify({
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
        });

        it('converts a paragraph with superscript text', function () {
            const result = mobiledocToLexical(JSON.stringify({
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

            assert.equal(result, JSON.stringify({
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
        });

        it('converts a paragraph with subscript text', function () {
            const result = mobiledocToLexical(JSON.stringify({
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

            assert.equal(result, JSON.stringify({
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
        });

        it('converts a paragraph with a link', function () {
            const result = mobiledocToLexical(JSON.stringify({
                version: MOBILEDOC_VERSION,
                ghostVersion: GHOST_VERSION,
                atoms: [],
                cards: [],
                markups: [
                    ['a', ['href', 'https://koenig.ghost.org']]
                ],
                sections: [
                    [1, 'p', [
                        [0, [], 0, 'Hello, '],
                        [0, [0], 1, 'world'],
                        [0, [], 0, '!']
                    ]]
                ]
            }));

            assert.equal(result, JSON.stringify({
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
                                    children: [
                                        {
                                            detail: 0,
                                            format: 0,
                                            mode: 'normal',
                                            style: '',
                                            text: 'world',
                                            type: 'text',
                                            version: 1
                                        }
                                    ],
                                    direction: 'ltr',
                                    format: '',
                                    indent: 0,
                                    type: 'link',
                                    rel: null,
                                    target: null,
                                    title: null,
                                    url: 'https://koenig.ghost.org',
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
        });

        it('converts a paragraph with a link with a format starting and ending inside', function () {
            const result = mobiledocToLexical(JSON.stringify({
                version: MOBILEDOC_VERSION,
                ghostVersion: GHOST_VERSION,
                atoms: [],
                cards: [],
                markups: [
                    ['a', ['href', 'https://koenig.ghost.org']],
                    ['strong']
                ],
                sections: [
                    [1,'p',[
                        [0, [], 0, 'Hello '],
                        [0, [0], 0, 'there '],
                        [0, [1], 1, 'beautiful'],
                        [0, [], 1, ' world'],
                        [0, [], 0, '!']
                    ]]
                ]
            }));

            assert.equal(result, JSON.stringify({
                root: {
                    children: [
                        {
                            children: [
                                {
                                    detail: 0,
                                    format: 0,
                                    mode: 'normal',
                                    style: '',
                                    text: 'Hello ',
                                    type: 'text',
                                    version: 1
                                },
                                {
                                    children: [
                                        {
                                            detail: 0,
                                            format: 0,
                                            mode: 'normal',
                                            style: '',
                                            text: 'there ',
                                            type: 'text',
                                            version: 1
                                        },
                                        {
                                            detail: 0,
                                            format: 1,
                                            mode: 'normal',
                                            style: '',
                                            text: 'beautiful',
                                            type: 'text',
                                            version: 1
                                        },
                                        {
                                            detail: 0,
                                            format: 0,
                                            mode: 'normal',
                                            style: '',
                                            text: ' world',
                                            type: 'text',
                                            version: 1
                                        }
                                    ],
                                    direction: 'ltr',
                                    format: '',
                                    indent: 0,
                                    type: 'link',
                                    rel: null,
                                    target: null,
                                    title: null,
                                    url: 'https://koenig.ghost.org',
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
        });

        it('converts a paragraph with a link where format starts inside and ends after', function () {
            const result = mobiledocToLexical(JSON.stringify({
                version: MOBILEDOC_VERSION,
                ghostVersion: GHOST_VERSION,
                atoms: [],
                cards: [],
                markups: [
                    ['a', ['href', 'https://koenig.ghost.org']],
                    ['strong']
                ],
                sections: [
                    [1, 'p', [
                        [0, [], 0, 'Plain '],
                        [0, [0], 0, 'link '],
                        [0, [1], 2, 'linkbold'],
                        [0, [1], 1, ' bold'],
                        [0, [], 0, ' plain']
                    ]]
                ]
            }));

            assert.equal(result, JSON.stringify({
                root: {
                    children: [
                        {
                            children: [
                                {
                                    detail: 0,
                                    format: 0,
                                    mode: 'normal',
                                    style: '',
                                    text: 'Plain ',
                                    type: 'text',
                                    version: 1
                                },
                                {
                                    children: [
                                        {
                                            detail: 0,
                                            format: 0,
                                            mode: 'normal',
                                            style: '',
                                            text: 'link ',
                                            type: 'text',
                                            version: 1
                                        },
                                        {
                                            detail: 0,
                                            format: 1,
                                            mode: 'normal',
                                            style: '',
                                            text: 'linkbold',
                                            type: 'text',
                                            version: 1
                                        }
                                    ],
                                    direction: 'ltr',
                                    format: '',
                                    indent: 0,
                                    type: 'link',
                                    rel: null,
                                    target: null,
                                    title: null,
                                    url: 'https://koenig.ghost.org',
                                    version: 1
                                },
                                {
                                    detail: 0,
                                    format: 1,
                                    mode: 'normal',
                                    style: '',
                                    text: ' bold',
                                    type: 'text',
                                    version: 1
                                },
                                {
                                    detail: 0,
                                    format: 0,
                                    mode: 'normal',
                                    style: '',
                                    text: ' plain',
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
        });

        it('converts a paragraph with a link where format starts before and ends inside', function () {
            const result = mobiledocToLexical(JSON.stringify({
                version: MOBILEDOC_VERSION,
                ghostVersion: GHOST_VERSION,
                atoms: [],
                cards: [],
                markups: [
                    ['strong'],
                    ['a', ['href', 'https://koenig.ghost.org']]
                ],
                sections: [
                    [1, 'p', [
                        [0, [], 0, 'Plain '],
                        [0, [0], 1, 'bold '],
                        [0, [1,0], 1, 'boldlink'],
                        [0, [], 1, ' link'],
                        [0, [], 0, ' plain']
                    ]]
                ]
            }));

            assert.equal(result, JSON.stringify({
                root: {
                    children: [
                        {
                            children: [
                                {
                                    detail: 0,
                                    format: 0,
                                    mode: 'normal',
                                    style: '',
                                    text: 'Plain ',
                                    type: 'text',
                                    version: 1
                                },
                                {
                                    detail: 0,
                                    format: 1,
                                    mode: 'normal',
                                    style: '',
                                    text: 'bold ',
                                    type: 'text',
                                    version: 1
                                },
                                {
                                    children: [
                                        {
                                            detail: 0,
                                            format: 1,
                                            mode: 'normal',
                                            style: '',
                                            text: 'boldlink',
                                            type: 'text',
                                            version: 1
                                        },
                                        {
                                            detail: 0,
                                            format: 0,
                                            mode: 'normal',
                                            style: '',
                                            text: ' link',
                                            type: 'text',
                                            version: 1
                                        }
                                    ],
                                    direction: 'ltr',
                                    format: '',
                                    indent: 0,
                                    type: 'link',
                                    rel: null,
                                    target: null,
                                    title: null,
                                    url: 'https://koenig.ghost.org',
                                    version: 1
                                },
                                {
                                    detail: 0,
                                    format: 0,
                                    mode: 'normal',
                                    style: '',
                                    text: ' plain',
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
        });

        it('converts a paragraph with a link surrounded by and containing formats', function () {
            const result = mobiledocToLexical(JSON.stringify({
                version: MOBILEDOC_VERSION,
                ghostVersion: GHOST_VERSION,
                atoms: [],
                cards: [],
                markups: [
                    ['strong'],
                    ['a', ['href', 'https://koenig.ghost.org']],
                    ['em']
                ],
                sections: [
                    [1, 'p', [
                        [0, [], 0, 'Plain '],
                        [0, [0], 1, 'startbold '],
                        [0, [1,0], 0, 'link '],
                        [0, [2], 1, 'italiclink'],
                        [0, [], 2, ' link'],
                        [0, [0], 1, ' endbold'],
                        [0, [], 0, ' plain']
                    ]]
                ]
            }));

            assert.equal(result, JSON.stringify({
                root: {
                    children: [
                        {
                            children: [
                                {
                                    detail: 0,
                                    format: 0,
                                    mode: 'normal',
                                    style: '',
                                    text: 'Plain ',
                                    type: 'text',
                                    version: 1
                                },
                                {
                                    detail: 0,
                                    format: 1,
                                    mode: 'normal',
                                    style: '',
                                    text: 'startbold ',
                                    type: 'text',
                                    version: 1
                                },
                                {
                                    children: [
                                        {
                                            detail: 0,
                                            format: 1,
                                            mode: 'normal',
                                            style: '',
                                            text: 'link ',
                                            type: 'text',
                                            version: 1
                                        },
                                        {
                                            detail: 0,
                                            format: 3,
                                            mode: 'normal',
                                            style: '',
                                            text: 'italiclink',
                                            type: 'text',
                                            version: 1
                                        },
                                        {
                                            detail: 0,
                                            format: 1,
                                            mode: 'normal',
                                            style: '',
                                            text: ' link',
                                            type: 'text',
                                            version: 1
                                        }
                                    ],
                                    direction: 'ltr',
                                    format: '',
                                    indent: 0,
                                    type: 'link',
                                    rel: null,
                                    target: null,
                                    title: null,
                                    url: 'https://koenig.ghost.org',
                                    version: 1
                                },
                                {
                                    detail: 0,
                                    format: 1,
                                    mode: 'normal',
                                    style: '',
                                    text: ' endbold',
                                    type: 'text',
                                    version: 1
                                },
                                {
                                    detail: 0,
                                    format: 0,
                                    mode: 'normal',
                                    style: '',
                                    text: ' plain',
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
        });

        it('converts a paragraph with line breaks', function () {
            const result = mobiledocToLexical(JSON.stringify({
                version: MOBILEDOC_VERSION,
                ghostVersion: GHOST_VERSION,
                atoms: [
                    ['soft-return', '', {}],
                    ['soft-return', '', {}]
                ],
                cards: [],
                markups: [],
                sections: [
                    [1, 'p', [
                        [0, [], 0, 'First line'],
                        [1, [], 0, 0],
                        [0, [], 0, 'Second line'],
                        [1, [], 0, 1],
                        [0, [], 0, 'Third line']
                    ]]
                ]
            }));

            assert.equal(result, JSON.stringify({
                root: {
                    children: [
                        {
                            children: [
                                {
                                    detail: 0,
                                    format: 0,
                                    mode: 'normal',
                                    style: '',
                                    text: 'First line',
                                    type: 'text',
                                    version: 1
                                },
                                {
                                    type: 'linebreak',
                                    version: 1
                                },
                                {
                                    detail: 0,
                                    format: 0,
                                    mode: 'normal',
                                    style: '',
                                    text: 'Second line',
                                    type: 'text',
                                    version: 1
                                },
                                {
                                    type: 'linebreak',
                                    version: 1
                                },
                                {
                                    detail: 0,
                                    format: 0,
                                    mode: 'normal',
                                    style: '',
                                    text: 'Third line',
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
        });

        it('converts all headings', function () {
            for (let i = 1; i < 7; i++) {
                const result = mobiledocToLexical(JSON.stringify({
                    version: MOBILEDOC_VERSION,
                    ghostVersion: GHOST_VERSION,
                    atoms: [],
                    cards: [],
                    markups: [],
                    sections: [
                        [1, `h${i}`, [[0, [], 0, `Heading ${i}`]]]
                    ]
                }));
    
                assert.equal(result, JSON.stringify({
                    root: {
                        children: [
                            {
                                children: [
                                    {
                                        detail: 0,
                                        format: 0,
                                        mode: 'normal',
                                        style: '',
                                        text: `Heading ${i}`,
                                        type: 'text',
                                        version: 1
                                    }
                                ],
                                direction: 'ltr',
                                format: '',
                                indent: 0,
                                type: 'heading',
                                tag: `h${i}`,
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
            }
        });

        it('converts headings with links and formatting', function () {
            const result = mobiledocToLexical(JSON.stringify({
                version: MOBILEDOC_VERSION,
                ghostVersion: GHOST_VERSION,
                atoms: [],
                cards: [],
                markups: [
                    ['a', ['href', 'https://koenig.ghost.org']],
                    ['em']
                ],
                sections: [
                    [1, 'h1', [
                        [0, [], 0, 'Heading with '],
                        [0, [0], 0, 'links and '],
                        [0, [1], 2, 'formatting']
                    ]]
                ]
            }));

            assert.equal(result, JSON.stringify({
                root: {
                    children: [
                        {
                            children: [
                                {
                                    detail: 0,
                                    format: 0,
                                    mode: 'normal',
                                    style: '',
                                    text: 'Heading with ',
                                    type: 'text',
                                    version: 1
                                },
                                {
                                    children: [
                                        {
                                            detail: 0,
                                            format: 0,
                                            mode: 'normal',
                                            style: '',
                                            text: 'links and ',
                                            type: 'text',
                                            version: 1
                                        },
                                        {
                                            detail: 0,
                                            format: 2,
                                            mode: 'normal',
                                            style: '',
                                            text: 'formatting',
                                            type: 'text',
                                            version: 1
                                        }
                                    ],
                                    direction: 'ltr',
                                    format: '',
                                    indent: 0,
                                    type: 'link',
                                    rel: null,
                                    target: null,
                                    title: null,
                                    url: 'https://koenig.ghost.org',
                                    version: 1
                                }
                            ],
                            direction: 'ltr',
                            format: '',
                            indent: 0,
                            type: 'heading',
                            tag: 'h1',
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
        });

        it('converts blockquotes', function () {
            const result = mobiledocToLexical(JSON.stringify({
                version: MOBILEDOC_VERSION,
                ghostVersion: GHOST_VERSION,
                atoms: [],
                cards: [],
                markups: [],
                sections: [
                    [1, 'blockquote', [[0, [], 0, 'Blockquote text']]]
                ]
            }));

            assert.equal(result, JSON.stringify({
                root: {
                    children: [
                        {
                            children: [
                                {
                                    detail: 0,
                                    format: 0,
                                    mode: 'normal',
                                    style: '',
                                    text: 'Blockquote text',
                                    type: 'text',
                                    version: 1
                                }
                            ],
                            direction: 'ltr',
                            format: '',
                            indent: 0,
                            type: 'quote',
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
        });

        it('converts blockquotes with links and formatting', function () {
            const result = mobiledocToLexical(JSON.stringify({
                version: MOBILEDOC_VERSION,
                ghostVersion: GHOST_VERSION,
                atoms: [],
                cards: [],
                markups: [
                    ['a', ['href', 'https://koenig.ghost.org']],
                    ['strong']
                ],
                sections: [
                    [1, 'blockquote', [
                        [0, [], 0, 'Blockquote with '],
                        [0, [0], 0, 'links and '],
                        [0, [1], 2, 'formatting'],
                        [0, [], 0, '.']
                    ]]
                ]
            }));

            assert.equal(result, JSON.stringify({
                root: {
                    children: [
                        {
                            children: [
                                {
                                    detail: 0,
                                    format: 0,
                                    mode: 'normal',
                                    style: '',
                                    text: 'Blockquote with ',
                                    type: 'text',
                                    version: 1
                                },
                                {
                                    children: [
                                        {
                                            detail: 0,
                                            format: 0,
                                            mode: 'normal',
                                            style: '',
                                            text: 'links and ',
                                            type: 'text',
                                            version: 1
                                        },
                                        {
                                            detail: 0,
                                            format: 1,
                                            mode: 'normal',
                                            style: '',
                                            text: 'formatting',
                                            type: 'text',
                                            version: 1
                                        }
                                    ],
                                    direction: 'ltr',
                                    format: '',
                                    indent: 0,
                                    type: 'link',
                                    rel: null,
                                    target: null,
                                    title: null,
                                    url: 'https://koenig.ghost.org',
                                    version: 1
                                },
                                {
                                    detail: 0,
                                    format: 0,
                                    mode: 'normal',
                                    style: '',
                                    text: '.',
                                    type: 'text',
                                    version: 1
                                }
                            ],
                            direction: 'ltr',
                            format: '',
                            indent: 0,
                            type: 'quote',
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
        });

        it('converts asides', function () {
            const result = mobiledocToLexical(JSON.stringify({
                version: MOBILEDOC_VERSION,
                ghostVersion: GHOST_VERSION,
                atoms: [],
                cards: [],
                markups: [],
                sections: [
                    [1, 'aside', [[0, [], 0, 'Aside text']]]
                ]
            }));

            assert.equal(result, JSON.stringify({
                root: {
                    children: [
                        {
                            children: [
                                {
                                    detail: 0,
                                    format: 0,
                                    mode: 'normal',
                                    style: '',
                                    text: 'Aside text',
                                    type: 'text',
                                    version: 1
                                }
                            ],
                            direction: 'ltr',
                            format: '',
                            indent: 0,
                            type: 'aside',
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
        });

        it('converts asides with links and formatting', function () {
            const result = mobiledocToLexical(JSON.stringify({
                version: MOBILEDOC_VERSION,
                ghostVersion: GHOST_VERSION,
                atoms: [],
                cards: [],
                markups: [
                    ['a', ['href', 'https://koenig.ghost.org']],
                    ['strong']
                ],
                sections: [
                    [1, 'aside', [
                        [0, [], 0, 'Aside with '],
                        [0, [0], 0, 'links and '],
                        [0, [1], 2, 'formatting'],
                        [0, [], 0, '.']
                    ]]
                ]
            }));

            assert.equal(result, JSON.stringify({
                root: {
                    children: [
                        {
                            children: [
                                {
                                    detail: 0,
                                    format: 0,
                                    mode: 'normal',
                                    style: '',
                                    text: 'Aside with ',
                                    type: 'text',
                                    version: 1
                                },
                                {
                                    children: [
                                        {
                                            detail: 0,
                                            format: 0,
                                            mode: 'normal',
                                            style: '',
                                            text: 'links and ',
                                            type: 'text',
                                            version: 1
                                        },
                                        {
                                            detail: 0,
                                            format: 1,
                                            mode: 'normal',
                                            style: '',
                                            text: 'formatting',
                                            type: 'text',
                                            version: 1
                                        }
                                    ],
                                    direction: 'ltr',
                                    format: '',
                                    indent: 0,
                                    type: 'link',
                                    rel: null,
                                    target: null,
                                    title: null,
                                    url: 'https://koenig.ghost.org',
                                    version: 1
                                },
                                {
                                    detail: 0,
                                    format: 0,
                                    mode: 'normal',
                                    style: '',
                                    text: '.',
                                    type: 'text',
                                    version: 1
                                }
                            ],
                            direction: 'ltr',
                            format: '',
                            indent: 0,
                            type: 'aside',
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
        });

        it('converts unordered lists', function () {
            const result = mobiledocToLexical(JSON.stringify({
                version: MOBILEDOC_VERSION,
                ghostVersion: GHOST_VERSION,
                atoms: [],
                cards: [],
                markups: [],
                sections: [
                    [3, 'ul', [
                        [[0, [], 0, 'one']],
                        [[0, [], 0, 'two']],
                        [[0, [], 0, 'three']]
                    ]]
                ]
            }));

            assert.equal(result, JSON.stringify({
                root: {
                    children: [
                        {
                            children: [
                                {
                                    children: [
                                        {
                                            detail: 0,
                                            format: 0,
                                            mode: 'normal',
                                            style: '',
                                            text: 'one',
                                            type: 'text',
                                            version: 1
                                        }
                                    ],
                                    direction: 'ltr',
                                    format: '',
                                    indent: 0,
                                    type: 'listitem',
                                    value: 1,
                                    version: 1
                                },
                                {
                                    children: [
                                        {
                                            detail: 0,
                                            format: 0,
                                            mode: 'normal',
                                            style: '',
                                            text: 'two',
                                            type: 'text',
                                            version: 1
                                        }
                                    ],
                                    direction: 'ltr',
                                    format: '',
                                    indent: 0,
                                    type: 'listitem',
                                    value: 2,
                                    version: 1
                                },
                                {
                                    children: [
                                        {
                                            detail: 0,
                                            format: 0,
                                            mode: 'normal',
                                            style: '',
                                            text: 'three',
                                            type: 'text',
                                            version: 1
                                        }
                                    ],
                                    direction: 'ltr',
                                    format: '',
                                    indent: 0,
                                    type: 'listitem',
                                    value: 3,
                                    version: 1
                                }
                            ],
                            direction: 'ltr',
                            format: '',
                            indent: 0,
                            tag: 'ul',
                            type: 'list',
                            listType: 'bullet',
                            start: 1,
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
        });

        it('converts lists with links and formatting', function () {
            const result = mobiledocToLexical(JSON.stringify({
                version: MOBILEDOC_VERSION,
                ghostVersion: GHOST_VERSION,
                atoms: [],
                cards: [],
                markups: [
                    ['a', ['href', 'https://koenig.ghost.org']],
                    ['strong']
                ],
                sections: [
                    [3, 'ul', [
                        [[0, [], 0, 'one']],
                        [
                            [0, [0, 1], 1, 'formatted'],
                            [0, [], 1, ' link']
                        ],
                        [[0, [], 0, 'three']]
                    ]]
                ]
            }));

            assert.equal(result, JSON.stringify({
                root: {
                    children: [
                        {
                            children: [
                                {
                                    children: [
                                        {
                                            detail: 0,
                                            format: 0,
                                            mode: 'normal',
                                            style: '',
                                            text: 'one',
                                            type: 'text',
                                            version: 1
                                        }
                                    ],
                                    direction: 'ltr',
                                    format: '',
                                    indent: 0,
                                    type: 'listitem',
                                    value: 1,
                                    version: 1
                                },
                                {
                                    children: [
                                        {
                                            children: [
                                                {
                                                    detail: 0,
                                                    format: 1,
                                                    mode: 'normal',
                                                    style: '',
                                                    text: 'formatted',
                                                    type: 'text',
                                                    version: 1
                                                },
                                                {
                                                    detail: 0,
                                                    format: 0,
                                                    mode: 'normal',
                                                    style: '',
                                                    text: ' link',
                                                    type: 'text',
                                                    version: 1
                                                }
                                            ],
                                            direction: 'ltr',
                                            format: '',
                                            indent: 0,
                                            type: 'link',
                                            rel: null,
                                            target: null,
                                            title: null,
                                            url: 'https://koenig.ghost.org',
                                            version: 1
                                        }
                                    ],
                                    direction: 'ltr',
                                    format: '',
                                    indent: 0,
                                    type: 'listitem',
                                    value: 2,
                                    version: 1
                                },
                                {
                                    children: [
                                        {
                                            detail: 0,
                                            format: 0,
                                            mode: 'normal',
                                            style: '',
                                            text: 'three',
                                            type: 'text',
                                            version: 1
                                        }
                                    ],
                                    direction: 'ltr',
                                    format: '',
                                    indent: 0,
                                    type: 'listitem',
                                    value: 3,
                                    version: 1
                                }
                            ],
                            direction: 'ltr',
                            format: '',
                            indent: 0,
                            tag: 'ul',
                            type: 'list',
                            listType: 'bullet',
                            start: 1,
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
        });

        it('converts ordered lists', function () {
            const result = mobiledocToLexical(JSON.stringify({
                version: MOBILEDOC_VERSION,
                ghostVersion: GHOST_VERSION,
                atoms: [],
                cards: [],
                markups: [],
                sections: [
                    [3, 'ol', [
                        [[0, [], 0, 'one']],
                        [[0, [], 0, 'two']],
                        [[0, [], 0, 'three']]
                    ]]
                ]
            }));

            assert.equal(result, JSON.stringify({
                root: {
                    children: [
                        {
                            children: [
                                {
                                    children: [
                                        {
                                            detail: 0,
                                            format: 0,
                                            mode: 'normal',
                                            style: '',
                                            text: 'one',
                                            type: 'text',
                                            version: 1
                                        }
                                    ],
                                    direction: 'ltr',
                                    format: '',
                                    indent: 0,
                                    type: 'listitem',
                                    value: 1,
                                    version: 1
                                },
                                {
                                    children: [
                                        {
                                            detail: 0,
                                            format: 0,
                                            mode: 'normal',
                                            style: '',
                                            text: 'two',
                                            type: 'text',
                                            version: 1
                                        }
                                    ],
                                    direction: 'ltr',
                                    format: '',
                                    indent: 0,
                                    type: 'listitem',
                                    value: 2,
                                    version: 1
                                },
                                {
                                    children: [
                                        {
                                            detail: 0,
                                            format: 0,
                                            mode: 'normal',
                                            style: '',
                                            text: 'three',
                                            type: 'text',
                                            version: 1
                                        }
                                    ],
                                    direction: 'ltr',
                                    format: '',
                                    indent: 0,
                                    type: 'listitem',
                                    value: 3,
                                    version: 1
                                }
                            ],
                            direction: 'ltr',
                            format: '',
                            indent: 0,
                            tag: 'ol',
                            type: 'list',
                            listType: 'number',
                            start: 1,
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
        });

        it('converts successfully when mobiledoc has missing values', function () {
            const result = mobiledocToLexical(JSON.stringify({version: '0.3.1',
                atoms: [],
                cards: [],
                markups: [
                    ['a']
                ],
                sections: [
                    [1,'p',[
                        [0,[0],1,'Blah Blah']
                    ]]
                ],
                ghostVersion: '3.0'}
            ));

            assert.equal(result, JSON.stringify({root: {
                children: [{
                    children: [{
                        children: [{
                            detail: 0,
                            format: 0,
                            mode: 'normal',
                            style: '',
                            text: 'Blah Blah',
                            type: 'text',
                            version: 1
                        }],
                        direction: 'ltr',
                        format: '',
                        indent: 0,
                        type: 'link',
                        rel: null,
                        target: null,
                        title: null,
                        version: 1
                    }],
                    direction: null,
                    format: '',
                    indent: 0,
                    type: 'paragraph',
                    version: 1
                }],
                direction: 'ltr',
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }}));
        });

        it('converts a paragraph with a link with a rel attribute', function () {
            const result = mobiledocToLexical(JSON.stringify({
                version: MOBILEDOC_VERSION,
                ghostVersion: GHOST_VERSION,
                atoms: [],
                cards: [],
                markups: [
                    ['a', ['href', 'https://koenig.ghost.org', 'rel', 'noopener noreferrer']]
                ],
                sections: [
                    [1, 'p', [
                        [0, [], 0, 'Hello, '],
                        [0, [0], 1, 'world'],
                        [0, [], 0, '!']
                    ]]
                ]
            }));

            assert.equal(result, JSON.stringify({
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
                                    children: [
                                        {
                                            detail: 0,
                                            format: 0,
                                            mode: 'normal',
                                            style: '',
                                            text: 'world',
                                            type: 'text',
                                            version: 1
                                        }
                                    ],
                                    direction: 'ltr',
                                    format: '',
                                    indent: 0,
                                    type: 'link',
                                    rel: 'noopener noreferrer',
                                    target: null,
                                    title: null,
                                    url: 'https://koenig.ghost.org',
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
        });
    });

    describe('cards', function () {
        it('moves all payload data over', function () {
            const result = mobiledocToLexical(JSON.stringify({
                version: MOBILEDOC_VERSION,
                ghostVersion: GHOST_VERSION,
                atoms: [],
                cards: [
                    ['image', {
                        version: 1,
                        src: 'https://koenig.ghost.org/content/images/2023/05/flip-flop.png',
                        width: 112,
                        height: 112,
                        title: '',
                        alt: 'White-soled flip flop with black strap',
                        caption: '<span>Flip flop</span>',
                        cardWidth: 'regular',
                        href: ''
                    }]
                ],
                markups: [],
                sections: [
                    [10, 0]
                ]
            }));

            assert.equal(result, JSON.stringify({
                root: {
                    children: [
                        {
                            type: 'image',
                            version: 1,
                            src: 'https://koenig.ghost.org/content/images/2023/05/flip-flop.png',
                            width: 112,
                            height: 112,
                            title: '',
                            alt: 'White-soled flip flop with black strap',
                            caption: '<span>Flip flop</span>',
                            cardWidth: 'regular',
                            href: ''
                        }
                    ],
                    direction: null,
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            }));
        });

        it('renames cards', function () {
            const result = mobiledocToLexical(JSON.stringify({
                version: MOBILEDOC_VERSION,
                ghostVersion: GHOST_VERSION,
                atoms: [],
                cards: [
                    ['code', {
                        version: 1,
                        code: 'testing'
                    }]
                ],
                markups: [],
                sections: [
                    [10, 0]
                ]
            }));

            assert.equal(result, JSON.stringify({
                root: {
                    children: [
                        {
                            type: 'codeblock',
                            version: 1,
                            code: 'testing'
                        }
                    ],
                    direction: null,
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            }));
        });

        it('renames payload properties', function () {
            const result = mobiledocToLexical(JSON.stringify({
                version: MOBILEDOC_VERSION,
                ghostVersion: GHOST_VERSION,
                atoms: [],
                cards: [
                    ['embed', {
                        version: 1,
                        type: 'twitter'
                    }]
                ],
                markups: [],
                sections: [
                    [10, 0]
                ]
            }));

            assert.equal(result, JSON.stringify({
                root: {
                    children: [
                        {
                            type: 'embed',
                            version: 1,
                            embedType: 'twitter'
                        }
                    ],
                    direction: null,
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            }));
        });

        it('renders paragraph when first section is a card', function () {
            const result = mobiledocToLexical(JSON.stringify({
                version: '0.3.2',
                atoms: [],
                cards: [
                    ['test', {card: 1}]
                ],
                markups: [],
                sections: [
                    [10, 0],
                    [1, 'p', []]
                ]
            }));

            assert.equal(result, JSON.stringify({
                root: {
                    children: [{
                        type: 'test',
                        card: 1
                    }, {
                        children: [],
                        direction: null,
                        format: '',
                        indent: 0,
                        type: 'paragraph',
                        version: 1
                    }],
                    direction: null,
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            }));
        });

        it('does not overwrite the type property', function () {
            const result = mobiledocToLexical(JSON.stringify({
                version: '0.3.2',
                atoms: [],
                cards: [
                    ['image',{src: 'https://media.tenor.com/images/90daac539a399e176dd7c69def020b1f/tenor.gif',width: 398,height: 224,caption: '',type: 'gif',href: 'https://dailyposter.outpost.pub/gift_subscription#/'}]
                ],
                markups: [],
                sections: [
                    [10, 0]
                ]
            }));

            assert.equal(result, JSON.stringify({
                root: {
                    children: [{
                        type: 'image',
                        src: 'https://media.tenor.com/images/90daac539a399e176dd7c69def020b1f/tenor.gif',
                        width: 398,
                        height: 224,
                        caption: '',
                        href: 'https://dailyposter.outpost.pub/gift_subscription#/'
                    }],
                    direction: null,
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            }));
        });
    });

    describe('card specifics', function () {
        it('renames HR', function () {
            const result = mobiledocToLexical(JSON.stringify({
                version: MOBILEDOC_VERSION,
                ghostVersion: GHOST_VERSION,
                atoms: [],
                cards: [
                    ['hr', {
                        version: 1
                    }]
                ],
                markups: [],
                sections: [
                    [10, 0]
                ]
            }));

            assert.equal(result, JSON.stringify({
                root: {
                    children: [
                        {
                            type: 'horizontalrule',
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
        });
    });
});
