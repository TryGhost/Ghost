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
const MD_ATOM_MARKER = 1;

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

function getOrSetAtomIndex(atom, mobiledoc) {
    let index = mobiledoc.atoms.findIndex(m => m[0] === atom);

    if (index === -1) {
        mobiledoc.atoms.push(atom);
        index = mobiledoc.atoms.length - 1;
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
        let openMarkups = [];

        // markup: a specific format, or tag name+attributes
        // marker: a piece of text with 0 or more markups

        paragraph.children.forEach((child, childIndex) => {
            if (child.type === 'text') {
                if (child.format !== 0) {
                    // text child has formats, track which are new and which have closed
                    const openedFormats = [];
                    const childFormats = readFormat(child.format);
                    let closedFormatCount = 0;

                    childFormats.forEach((format) => {
                        if (!openMarkups.includes(format)) {
                            openMarkups.push(format);
                            openedFormats.push(format);
                        }
                    });

                    // mobiledoc will immediately close any formats if the next section doesn't use them or it's not a text section
                    if (!paragraph.children[childIndex + 1] || paragraph.children[childIndex + 1].type !== 'text') {
                        // no more children, close all formats
                        closedFormatCount = openMarkups.length;
                        openMarkups = [];
                    } else {
                        const nextChild = paragraph.children[childIndex + 1];
                        const nextFormats = readFormat(nextChild.format);
                        const firstMissingFormatIndex = openMarkups.findIndex(format => !nextFormats.includes(format));

                        if (firstMissingFormatIndex !== -1) {
                            const formatsToClose = openMarkups.slice(firstMissingFormatIndex);
                            closedFormatCount = formatsToClose.length;
                            openMarkups = openMarkups.slice(0, firstMissingFormatIndex);
                        }
                    }

                    const markupIndexes = openedFormats.map(format => getOrSetMarkupIndex(format, mobiledoc));
                    markers.push([MD_TEXT_MARKER, markupIndexes, closedFormatCount, child.text]);
                } else {
                    // text child has no formats so we close all formats in mobiledoc
                    let closedFormatCount = openMarkups.length;
                    openMarkups = [];

                    markers.push([MD_TEXT_MARKER, [], closedFormatCount, child.text]);
                }
            }

            if (child.type === 'link') {
                const linkMarkup = ['a', ['href', child.url]];
                const linkMarkupIndex = mobiledoc.markups.push(linkMarkup) - 1;

                child.children.forEach((linkChild, linkChildIndex) => {
                    if (linkChild.format !== 0) {
                        const openedMarkupIndexes = [];
                        const openedFormats = [];

                        // first child of a link opens the link markup
                        if (linkChildIndex === 0) {
                            openMarkups.push(linkMarkup);
                            openedMarkupIndexes.push(linkMarkupIndex);
                        }

                        // text child has formats, track which are new and which have closed
                        const childFormats = readFormat(linkChild.format);
                        let closedMarkupCount = 0;

                        childFormats.forEach((format) => {
                            if (!openMarkups.includes(format)) {
                                openMarkups.push(format);
                                openedFormats.push(format);
                            }
                        });

                        // mobiledoc will immediately close any formats if the next section doesn't use them
                        if (!child.children[linkChildIndex + 1]) {
                            // last child of a link closes all markups
                            closedMarkupCount = openMarkups.length;
                            openMarkups = [];
                        } else {
                            const nextChild = child.children[linkChildIndex + 1];
                            const nextFormats = readFormat(nextChild.format);

                            const firstMissingFormatIndex = openMarkups.findIndex((markup) => {
                                const markupIsLink = JSON.stringify(markup) === JSON.stringify(linkMarkup);
                                return !markupIsLink && !nextFormats.includes(markup);
                            });

                            if (firstMissingFormatIndex !== -1) {
                                const formatsToClose = openMarkups.slice(firstMissingFormatIndex);
                                closedMarkupCount = formatsToClose.length;
                                openMarkups = openMarkups.slice(0, firstMissingFormatIndex);
                            }
                        }

                        openedMarkupIndexes.push(...openedFormats.map(format => getOrSetMarkupIndex(format, mobiledoc)));

                        markers.push([MD_TEXT_MARKER, openedMarkupIndexes, closedMarkupCount, linkChild.text]);
                    } else {
                        const openedMarkupIndexes = [];

                        // first child of a link opens the link markup
                        if (linkChildIndex === 0) {
                            openMarkups.push(linkMarkup);
                            openedMarkupIndexes.push(linkMarkupIndex);
                        }

                        let closedMarkupCount = openMarkups.length - 1; // don't close the link markup, just the others

                        // last child of a link closes all markups
                        if (!child.children[linkChildIndex + 1]) {
                            closedMarkupCount += 1; // close the link markup
                            openMarkups = [];
                        }

                        markers.push([MD_TEXT_MARKER, openedMarkupIndexes, closedMarkupCount, linkChild.text]);
                    }
                });
            }

            if (child.type === 'linebreak') {
                const atom = ['soft-return', '', {}];
                const atomIndex = getOrSetAtomIndex(atom, mobiledoc);
                markers.push([MD_ATOM_MARKER, [], 0, atomIndex]);
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
