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

const MD_TEXT_SECTION = 1;
// const MD_LIST_SECTION = 3;
// const MD_CARD_SECTION = 10;

const MD_TEXT_MARKER = 0;
// const MD_ATOM_MARKER = 1;

const L_IS_BOLD = 1;
const L_IS_ITALIC = 1 << 1;
const L_IS_STRIKETHROUGH = 1 << 2;
const L_IS_UNDERLINE = 1 << 3;
const L_IS_CODE = 1 << 4;
const L_IS_SUBSCRIPT = 1 << 5;
const L_IS_SUPERSCRIPT = 1 << 6;

const L_FORMAT_MAP = new Map([
    [L_IS_BOLD, 'strong'],
    [L_IS_ITALIC, 'em'],
    [L_IS_STRIKETHROUGH, 's'],
    [L_IS_UNDERLINE, 'u'],
    [L_IS_CODE, 'code'],
    [L_IS_SUBSCRIPT, 'sub'],
    [L_IS_SUPERSCRIPT, 'sup']
]);

export function lexicalToMobiledoc(serializedLexical) {
    if (serializedLexical === null || serializedLexical === undefined || serializedLexical === '') {
        return JSON.stringify(BLANK_DOC);
    }

    const lexical = JSON.parse(serializedLexical);

    if (!lexical.root) {
        return JSON.stringify(BLANK_DOC);
    }

    const mobiledoc = buildEmptyDoc();

    lexical.root.children.forEach(child => addRootChild(child, mobiledoc));

    return JSON.stringify(mobiledoc);
}

/* internal functions ------------------------------------------------------- */

function buildEmptyDoc() {
    return {
        version: MOBILEDOC_VERSION,
        ghostVersion: GHOST_VERSION,
        atoms: [],
        cards: [],
        markups: [],
        sections: []
    };
}

function getOrSetMarkupIndex(markup, mobiledoc) {
    let index = mobiledoc.markups.findIndex(m => m[0] === markup);

    if (index === -1) {
        mobiledoc.markups.push([markup]);
        index = mobiledoc.markups.length - 1;
    }

    return index;
}

function addRootChild(child, mobiledoc) {
    if (child.type === 'paragraph') {
        addParagraphChild(child, mobiledoc);
    }
}

function addParagraphChild(paragraph, mobiledoc) {
    const markers = [];
    const section = [MD_TEXT_SECTION, 'p', markers];

    if (!paragraph.children.length) {
        markers.push([MD_TEXT_MARKER, [], 0, '']);
    } else {
        // mobiledoc tracks opened/closed formats across markers whereas lexical
        // lists all formats for each marker so we need to manually track open formats
        let openFormats = [];

        paragraph.children.forEach((child, childIndex) => {
            if (child.type === 'text') {
                if (child.format !== 0) {
                    const openedFormats = [];
                    // text child has formats, track which are new and which have closed
                    const childFormats = readFormat(child.format);
                    let closedFormatCount = 0;

                    childFormats.forEach((format) => {
                        if (!openFormats.includes(format)) {
                            openFormats.push(format);
                            openedFormats.push(format);
                        }
                    });

                    // mobiledoc will immediately close any formats if the next section doesn't use them
                    if (!paragraph.children[childIndex + 1]) {
                        closedFormatCount = openFormats.length;
                        openFormats = [];
                    } else {
                        const nextFormats = readFormat(paragraph.children[childIndex + 1].format);
                        const firstMissingFormatIndex = openFormats.findIndex(format => !nextFormats.includes(format));

                        if (firstMissingFormatIndex !== -1) {
                            const formatsToClose = openFormats.slice(firstMissingFormatIndex);
                            closedFormatCount = formatsToClose.length;
                            openFormats = openFormats.slice(0, firstMissingFormatIndex);
                        }
                    }

                    const markupIndexes = openedFormats.map(format => getOrSetMarkupIndex(format, mobiledoc));
                    markers.push([MD_TEXT_MARKER, markupIndexes, closedFormatCount, child.text]);
                } else {
                    // text child has no formats so we close all formats in mobiledoc
                    let closedFormatCount = openFormats.length;
                    openFormats = [];

                    markers.push([MD_TEXT_MARKER, [], closedFormatCount, child.text]);
                }
            }
        });
    }

    mobiledoc.sections.push(section);
}

// Lexical stores formats as a bitmask, so we need to read the bitmask to
// determine which formats are present
function readFormat(format) {
    const formats = [];

    L_FORMAT_MAP.forEach((value, key) => {
        if ((format & key) !== 0) {
            formats.push(value);
        }
    });

    return formats;
}
