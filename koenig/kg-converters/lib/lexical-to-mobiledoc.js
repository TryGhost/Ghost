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
const MD_LIST_SECTION = 3;
const MD_CARD_SECTION = 10;

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

const HEADING_TYPES = ['heading', 'extended-heading'];
const TEXT_TYPES = ['text', 'extended-text'];

// TODO: Feels a little too explicit as it will need updating every time we add a new card.
//
// One alternative is to use a list of all built-in Lexical types and assume that anything
// not listed is a card but that feels more dangerous.
//
// Another alternative is to grab the list of cards from kg-default-nodes but that's creating
// more inter-dependencies that makes development setup tricky.
const KNOWN_CARDS = [
    'audio',
    'bookmark',
    'button',
    'callout',
    'codeblock',
    'email-cta',
    'email',
    'embed',
    'file',
    'gallery',
    'header',
    'horizontalrule',
    'html',
    'image',
    'markdown',
    'paywall',
    'product',
    'signup',
    'toggle',
    'video'
];

const CARD_NAME_MAP = {
    codeblock: 'code',
    horizontalrule: 'hr'
};

const CARD_PROPERTY_MAP = {
    embed: {
        embedType: 'type'
    }
};

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
        addTextSection(child, mobiledoc);
    }

    if (HEADING_TYPES.includes(child.type)) {
        addTextSection(child, mobiledoc, child.tag);
    }

    if (child.type === 'quote') {
        addTextSection(child, mobiledoc, 'blockquote');
    }

    if (child.type === 'aside') {
        addTextSection(child, mobiledoc, 'aside');
    }

    if (child.type === 'list') {
        addListSection(child, mobiledoc, child.tag);
    }

    if (KNOWN_CARDS.includes(child.type)) {
        addCardSection(child, mobiledoc);
    }
}

function addTextSection(childWithFormats, mobiledoc, tagName = 'p') {
    const markers = buildMarkers(childWithFormats, mobiledoc);
    const section = [MD_TEXT_SECTION, tagName, markers];

    mobiledoc.sections.push(section);
}

function addListSection(listChild, mobiledoc, tagName = 'ul') {
    const listItems = buildListItems(listChild, mobiledoc);
    const section = [MD_LIST_SECTION, tagName, listItems];

    mobiledoc.sections.push(section);
}

function buildListItems(listRoot, mobiledoc) {
    const listItems = [];

    flattenListChildren(listRoot);

    listRoot.children.forEach((listItemChild) => {
        if (listItemChild.type === 'listitem') {
            const markers = buildMarkers(listItemChild, mobiledoc);
            listItems.push(markers);
        }
    });

    return listItems;
}

function flattenListChildren(listRoot) {
    const flatListItems = [];

    function traverse(item) {
        item.children?.forEach((child) => {
            child.children?.forEach((grandchild) => {
                if (grandchild.type === 'list') {
                    traverse(grandchild);
                    child.children.splice(child.children.indexOf(grandchild), 1);
                }
            });

            if (child.type === 'listitem' && child.children.length) {
                flatListItems.push(child);
            }
        });
    }

    traverse(listRoot);
    listRoot.children = flatListItems;
}

function buildMarkers(childWithFormats, mobiledoc) {
    const markers = [];

    if (!childWithFormats.children.length) {
        markers.push([MD_TEXT_MARKER, [], 0, '']);
    } else {
        // mobiledoc tracks opened/closed formats across markers whereas lexical
        // lists all formats for each marker so we need to manually track open formats
        let openMarkups = [];

        // markup: a specific format, or tag name+attributes
        // marker: a piece of text with 0 or more markups

        childWithFormats.children.forEach((child, childIndex) => {
            if (TEXT_TYPES.includes(child.type)) {
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
                    if (!childWithFormats.children[childIndex + 1] || !TEXT_TYPES.includes(childWithFormats.children[childIndex + 1].type)) {
                        // no more children, close all formats
                        closedFormatCount = openMarkups.length;
                        openMarkups = [];
                    } else {
                        const nextChild = childWithFormats.children[childIndex + 1];
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

    return markers;
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

function addCardSection(child, mobiledoc) {
    const cardType = child.type;

    let cardName = child.type;
    // rename card if there's a difference between lexical/mobiledoc
    if (CARD_NAME_MAP[cardName]) {
        cardName = CARD_NAME_MAP[cardName];
    }
    // don't include type in the payload
    delete child.type;

    // rename any properties to match mobiledoc
    if (CARD_PROPERTY_MAP[cardType]) {
        const map = CARD_PROPERTY_MAP[cardType];

        for (const [key, value] of Object.entries(map)) {
            child[value] = child[key];
            delete child[key];
        }
    }

    const card = [cardName, child];
    mobiledoc.cards.push(card);

    const cardIndex = mobiledoc.cards.length - 1;
    const section = [MD_CARD_SECTION, cardIndex];

    mobiledoc.sections.push(section);
}
