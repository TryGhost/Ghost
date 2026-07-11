const MOBILEDOC_VERSION = '0.3.1';
const GHOST_VERSION = '4.0';

// Mobiledoc types
type MobiledocMarkup = [string, ...unknown[]];
type MobiledocAtom = [string, string, Record<string, unknown>];
type MobiledocCard = [string, Record<string, unknown>];
type MobiledocSection = unknown[];

interface MobiledocDocument {
    version: string;
    ghostVersion: string;
    atoms: MobiledocAtom[];
    cards: MobiledocCard[];
    markups: MobiledocMarkup[];
    sections: MobiledocSection[];
}

// Lexical types
interface LexicalNode {
    type: string;
    format?: number;
    text?: string;
    tag?: string;
    url?: string;
    children?: LexicalNode[];
    [key: string]: unknown;
}

const BLANK_DOC: MobiledocDocument = {
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

const L_FORMAT_MAP = new Map<number, string>([
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

const CARD_NAME_MAP: Record<string, string> = {
    codeblock: 'code',
    horizontalrule: 'hr'
};

const CARD_PROPERTY_MAP: Record<string, Record<string, string>> = {
    embed: {
        embedType: 'type'
    }
};

export function lexicalToMobiledoc(serializedLexical: string | null | undefined): string {
    if (serializedLexical === null || serializedLexical === undefined || serializedLexical === '') {
        return JSON.stringify(BLANK_DOC);
    }

    const lexical = JSON.parse(serializedLexical) as {root?: {children?: LexicalNode[]}};

    if (!lexical.root) {
        return JSON.stringify(BLANK_DOC);
    }

    const mobiledoc = buildEmptyDoc();

    lexical.root.children?.forEach((child: LexicalNode) => addRootChild(child, mobiledoc));

    return JSON.stringify(mobiledoc);
}

/* internal functions ------------------------------------------------------- */

function buildEmptyDoc(): MobiledocDocument {
    return {
        version: MOBILEDOC_VERSION,
        ghostVersion: GHOST_VERSION,
        atoms: [],
        cards: [],
        markups: [],
        sections: []
    };
}

function getOrSetMarkupIndex(markup: string, mobiledoc: MobiledocDocument): number {
    let index = mobiledoc.markups.findIndex((m: MobiledocMarkup) => m[0] === markup);

    if (index === -1) {
        mobiledoc.markups.push([markup]);
        index = mobiledoc.markups.length - 1;
    }

    return index;
}

function getOrSetAtomIndex(atom: MobiledocAtom, mobiledoc: MobiledocDocument): number {
    let index = mobiledoc.atoms.findIndex((m: MobiledocAtom) => m === atom);

    if (index === -1) {
        mobiledoc.atoms.push(atom);
        index = mobiledoc.atoms.length - 1;
    }

    return index;
}

function addRootChild(child: LexicalNode, mobiledoc: MobiledocDocument): void {
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

function addTextSection(childWithFormats: LexicalNode, mobiledoc: MobiledocDocument, tagName: string = 'p'): void {
    const markers = buildMarkers(childWithFormats, mobiledoc);
    const section: MobiledocSection = [MD_TEXT_SECTION, tagName, markers];

    mobiledoc.sections.push(section);
}

function addListSection(listChild: LexicalNode, mobiledoc: MobiledocDocument, tagName: string = 'ul'): void {
    const listItems = buildListItems(listChild, mobiledoc);
    const section: MobiledocSection = [MD_LIST_SECTION, tagName, listItems];

    mobiledoc.sections.push(section);
}

function buildListItems(listRoot: LexicalNode, mobiledoc: MobiledocDocument): unknown[][] {
    const listItems: unknown[][] = [];

    flattenListChildren(listRoot);

    listRoot.children?.forEach((listItemChild: LexicalNode) => {
        if (listItemChild.type === 'listitem') {
            const markers = buildMarkers(listItemChild, mobiledoc);
            listItems.push(markers);
        }
    });

    return listItems;
}

function flattenListChildren(listRoot: LexicalNode): void {
    const flatListItems: LexicalNode[] = [];

    function traverse(item: LexicalNode): void {
        item.children?.forEach((child: LexicalNode) => {
            child.children?.forEach((grandchild: LexicalNode) => {
                if (grandchild.type === 'list') {
                    traverse(grandchild);
                    child.children!.splice(child.children!.indexOf(grandchild), 1);
                }
            });

            if (child.type === 'listitem' && child.children?.length) {
                flatListItems.push(child);
            }
        });
    }

    traverse(listRoot);
    listRoot.children = flatListItems;
}

// markup type: string tag name or [string, string[]] link markup
type OpenMarkup = string | MobiledocMarkup;

function buildMarkers(childWithFormats: LexicalNode, mobiledoc: MobiledocDocument): unknown[] {
    const markers: unknown[] = [];

    if (!childWithFormats.children?.length) {
        markers.push([MD_TEXT_MARKER, [], 0, '']);
    } else {
        // mobiledoc tracks opened/closed formats across markers whereas lexical
        // lists all formats for each marker so we need to manually track open formats
        let openMarkups: OpenMarkup[] = [];

        // markup: a specific format, or tag name+attributes
        // marker: a piece of text with 0 or more markups

        childWithFormats.children.forEach((child: LexicalNode, childIndex: number) => {
            if (TEXT_TYPES.includes(child.type)) {
                if (child.format !== 0) {
                    // text child has formats, track which are new and which have closed
                    const openedFormats: string[] = [];
                    const childFormats = readFormat(child.format as number);
                    let closedFormatCount = 0;

                    childFormats.forEach((format) => {
                        if (!openMarkups.includes(format)) {
                            openMarkups.push(format);
                            openedFormats.push(format);
                        }
                    });

                    // mobiledoc will immediately close any formats if the next section doesn't use them or it's not a text section
                    if (!childWithFormats.children![childIndex + 1] || !TEXT_TYPES.includes(childWithFormats.children![childIndex + 1].type)) {
                        // no more children, close all formats
                        closedFormatCount = openMarkups.length;
                        openMarkups = [];
                    } else {
                        const nextChild = childWithFormats.children![childIndex + 1];
                        const nextFormats = readFormat(nextChild.format as number);
                        const firstMissingFormatIndex = openMarkups.findIndex((format: OpenMarkup) => !nextFormats.includes(format as string));

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
                    const closedFormatCount = openMarkups.length;
                    openMarkups = [];

                    markers.push([MD_TEXT_MARKER, [], closedFormatCount, child.text]);
                }
            }

            if (child.type === 'link') {
                const linkMarkup: MobiledocMarkup = ['a', ['href', child.url]];
                const linkMarkupIndex = mobiledoc.markups.push(linkMarkup) - 1;

                child.children?.forEach((linkChild: LexicalNode, linkChildIndex: number) => {
                    if (linkChild.format !== 0) {
                        const openedMarkupIndexes: number[] = [];
                        const openedFormats: string[] = [];

                        // first child of a link opens the link markup
                        if (linkChildIndex === 0) {
                            openMarkups.push(linkMarkup);
                            openedMarkupIndexes.push(linkMarkupIndex);
                        }

                        // text child has formats, track which are new and which have closed
                        const childFormats = readFormat(linkChild.format as number);
                        let closedMarkupCount = 0;

                        childFormats.forEach((format) => {
                            if (!openMarkups.includes(format)) {
                                openMarkups.push(format);
                                openedFormats.push(format);
                            }
                        });

                        // mobiledoc will immediately close any formats if the next section doesn't use them
                        if (!child.children![linkChildIndex + 1]) {
                            // last child of a link closes all markups
                            closedMarkupCount = openMarkups.length;
                            openMarkups = [];
                        } else {
                            const nextChild = child.children![linkChildIndex + 1];
                            const nextFormats = readFormat(nextChild.format as number);

                            const firstMissingFormatIndex = openMarkups.findIndex((markup: OpenMarkup) => {
                                const markupIsLink = JSON.stringify(markup) === JSON.stringify(linkMarkup);
                                return !markupIsLink && !nextFormats.includes(markup as string);
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
                        const openedMarkupIndexes: number[] = [];

                        // first child of a link opens the link markup
                        if (linkChildIndex === 0) {
                            openMarkups.push(linkMarkup);
                            openedMarkupIndexes.push(linkMarkupIndex);
                        }

                        let closedMarkupCount = openMarkups.length - 1; // don't close the link markup, just the others

                        // last child of a link closes all markups
                        if (!child.children![linkChildIndex + 1]) {
                            closedMarkupCount += 1; // close the link markup
                            openMarkups = [];
                        }

                        markers.push([MD_TEXT_MARKER, openedMarkupIndexes, closedMarkupCount, linkChild.text]);
                    }
                });
            }

            if (child.type === 'linebreak') {
                const atom: MobiledocAtom = ['soft-return', '', {}];
                const atomIndex = getOrSetAtomIndex(atom, mobiledoc);
                markers.push([MD_ATOM_MARKER, [], 0, atomIndex]);
            }
        });
    }

    return markers;
}

// Lexical stores formats as a bitmask, so we need to read the bitmask to
// determine which formats are present
function readFormat(format: number): string[] {
    const formats: string[] = [];

    L_FORMAT_MAP.forEach((value, key) => {
        if ((format & key) !== 0) {
            formats.push(value);
        }
    });

    return formats;
}

function addCardSection(child: LexicalNode, mobiledoc: MobiledocDocument): void {
    const cardType = child.type;

    let cardName: string = child.type;
    // rename card if there's a difference between lexical/mobiledoc
    if (CARD_NAME_MAP[cardName]) {
        cardName = CARD_NAME_MAP[cardName];
    }
    // don't include type in the payload
    const payload: Record<string, unknown> = {};
    for (const key of Object.keys(child)) {
        if (key !== 'type') {
            payload[key] = child[key];
        }
    }

    // rename any properties to match mobiledoc
    if (CARD_PROPERTY_MAP[cardType]) {
        const map = CARD_PROPERTY_MAP[cardType];

        for (const [key, value] of Object.entries(map)) {
            payload[value] = payload[key];
            delete payload[key];
        }
    }

    const card: MobiledocCard = [cardName, payload];
    mobiledoc.cards.push(card);

    const cardIndex = mobiledoc.cards.length - 1;
    const section: MobiledocSection = [MD_CARD_SECTION, cardIndex];

    mobiledoc.sections.push(section);
}
