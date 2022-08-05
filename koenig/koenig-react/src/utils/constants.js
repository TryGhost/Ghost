export const ADD_CARD_HOOK = 'addComponent';
export const REMOVE_CARD_HOOK = 'removeComponent';
export const ADD_ATOM_HOOK = 'addAtomComponent';
export const REMOVE_ATOM_HOOK = 'removeAtomComponent';

// blank doc contains a single empty paragraph so that there's some content for
// the cursor to start in
export const MOBILEDOC_VERSION = '0.3.1';
export const BLANK_DOC = {
    version: MOBILEDOC_VERSION,
    ghostVersion: '4.0',
    markups: [],
    atoms: [],
    cards: [],
    sections: [
        [1, 'p', [
            [0, [], 0, '']
        ]]
    ]
};

export const CURSOR_BEFORE = -1;
export const CURSOR_AFTER = 1;
export const NO_CURSOR_MOVEMENT = 0;

// markups that should not be continued when typing and reverted to their
// text expansion style when backspacing over final char of markup
export const SPECIAL_MARKUPS = {
    S: '~~',
    CODE: '`',
    SUP: '^',
    SUB: '~'
};
