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

const TAG_TO_LEXICAL_NODE = {
    p: {
        type: 'paragraph'
    },
    h1: {
        type: 'heading',
        tag: 'h1'
    },
    h2: {
        type: 'heading',
        tag: 'h2'
    },
    h3: {
        type: 'heading',
        tag: 'h3'
    },
    h4: {
        type: 'heading',
        tag: 'h4'
    },
    h5: {
        type: 'heading',
        tag: 'h5'
    },
    h6: {
        type: 'heading',
        tag: 'h6'
    },
    blockquote: {
        type: 'quote'
    },
    aside: {
        type: 'aside'
    },
    a: {
        type: 'link',
        rel: null,
        target: null,
        title: null,
        url: null
    }
};

const ATOM_TO_LEXICAL_NODE = {
    'soft-return': {
        type: 'linebreak',
        version: 1
    }
};

const MARKUP_TO_FORMAT = {
    strong: 1,
    b: 1,
    em: 1 << 1,
    i: 1 << 1,
    s: 1 << 2,
    u: 1 << 3,
    code: 1 << 4,
    sub: 1 << 5,
    sup: 1 << 6
};

const CARD_NAME_MAP = {
    code: 'codeblock',
    hr: 'horizontalrule'
};

const CARD_PROPERTY_MAP = {
    embed: {
        type: 'embedType'
    }
};

const CARD_FIXES_MAP = {
    callout: (payload) => {
        if (payload.backgroundColor && !payload.backgroundColor.match(/^[a-zA-Z\d-]+$/)) {
            payload.backgroundColor = 'white';
        }

        return payload;
    }
};

export function mobiledocToLexical(serializedMobiledoc) {
    if (serializedMobiledoc === null || serializedMobiledoc === undefined || serializedMobiledoc === '') {
        return JSON.stringify(BLANK_DOC);
    }

    const mobiledoc = JSON.parse(serializedMobiledoc);

    if (!mobiledoc.sections) {
        return JSON.stringify(BLANK_DOC);
    }

    const lexical = buildEmptyDoc();

    mobiledoc.sections.forEach(child => addRootChild(child, mobiledoc, lexical));

    return JSON.stringify(lexical);
}

/* internal functions ------------------------------------------------------- */

function buildEmptyDoc() {
    return {
        root: {
            children: [],
            direction: null,
            format: '',
            indent: 0,
            type: 'root',
            version: 1
        }
    };
}

function addRootChild(child, mobiledoc, lexical) {
    const sectionTypeIdentifier = child[0];
    if (sectionTypeIdentifier === 1) {
        // Markup (text) section
        const lexicalChild = convertMarkupSectionToLexical(child, mobiledoc);
        lexical.root.children.push(lexicalChild);

        // Set direction to ltr if there is any text
        // Otherwise direction should be null
        // Not sure if this is necessary:
        // if we don't plan to support RTL, we could just set 'ltr' in all cases and ignore null
        if (lexicalChild.children?.length > 0) {
            lexical.root.direction = 'ltr';
        }
    } else if (sectionTypeIdentifier === 2) {
        // Image section
        // Not used in Ghost
    } else if (sectionTypeIdentifier === 3) {
        // List section
        const lexicalChild = convertListSectionToLexical(child, mobiledoc);
        lexical.root.children.push(lexicalChild);
        lexical.root.direction = 'ltr'; // mobiledoc only supports LTR
    } else if (sectionTypeIdentifier === 10) {
        // Card section
        const lexicalChild = convertCardSectionToLexical(child, mobiledoc);
        lexical.root.children.push(lexicalChild);
    }
}

function convertMarkupSectionToLexical(section, mobiledoc) {
    const tagName = section[1]; // e.g. 'p'
    const markers = section[2]; // e.g. [[0, [0], 0, "Hello world"]]

    // Create an empty Lexical node from the tag name
    // We will add nodes to the children array later
    const lexicalNode = createEmptyLexicalNode(tagName);

    populateLexicalNodeWithMarkers(lexicalNode, markers, mobiledoc);

    return lexicalNode;
}

function populateLexicalNodeWithMarkers(lexicalNode, markers, mobiledoc) {
    const markups = mobiledoc.markups;
    const atoms = mobiledoc.atoms;

    // Initiate some variables before looping over all the markers
    let openMarkups = []; // tracks which markup tags are open for the current marker
    let linkNode = undefined; // tracks current link node or undefined if no a tag is open
    let href = undefined; // tracks the href for the current link node or undefined if no a tag is open
    let rel = undefined; //tracks the rel attribute for the current link node or undefined if no a tag is open
    let openLinkMarkup = false; // tracks whether the current node is a link node

    // loop over markers and convert each one to lexical
    for (let i = 0; i < markers.length; i++) {
        // grab the attributes from the current marker
        const [
            textTypeIdentifier,
            openMarkupsIndexes,
            numberOfClosedMarkups,
            value
        ] = markers[i];

        // Markers are either text (markup) or atoms
        const markerType = textTypeIdentifier === 0 ? 'markup' : 'atom';

        // If the current marker is an atom, convert the atom to Lexical and add to the node
        if (markerType === 'atom') {
            const atom = atoms[value];
            const atomName = atom[0];
            const childNode = ATOM_TO_LEXICAL_NODE[atomName];
            embedChildNode(lexicalNode, childNode);
            continue;
        }

        // calculate which markups are open for the current marker
        openMarkupsIndexes.forEach((markupIndex) => {
            const markup = markups[markupIndex];
            // Extract the href from the markup if it's a link
            if (markup[0] === 'a') {
                openLinkMarkup = true;
                if (markup[1] && markup[1][0] === 'href') {
                    href = markup[1][1];
                }

                if (markup[1] && markup[1][2] === 'rel') {
                    rel = markup[1][3];
                }
            }
            // Add the markup to the list of open markups
            openMarkups.push(markup);
        });

        if (value !== undefined) {
            // Convert the open markups to a bitmask compatible with Lexical
            const format = convertMarkupTagsToLexicalFormatBitmask(openMarkups);

            // If there is an open link tag, add the text to the link node
            // Otherwise add the text to the parent node
            if (openLinkMarkup) { // link is open
                // Create an empty link node if it doesn't exist already
                linkNode = linkNode !== undefined ? linkNode : createEmptyLexicalNode('a', {url: href, rel: rel || null});

                // Create a text node and add it to the link node
                const textNode = createTextNode(value, format);
                embedChildNode(linkNode, textNode);
            } else {
                const textNode = createTextNode(value, format);
                embedChildNode(lexicalNode, textNode);
            }
        }

        // Close any markups that are closed after the current marker
        // Remove any closed markups from openMarkups list
        for (let j = 0; j < numberOfClosedMarkups; j++) {
            // Remove the most recently opened markup from the list of open markups
            const markup = openMarkups.pop();

            // If we're closing a link tag, add the linkNode to the node
            // Reset href and linkNode for the next markup
            if (markup && markup[0] === 'a') {
                embedChildNode(lexicalNode, linkNode);
                openLinkMarkup = false;
                href = undefined;
                linkNode = undefined;
            }
        }
    }
}

// Creates a text node from the given text and format
function createTextNode(text, format) {
    return {
        detail: 0,
        format: format,
        mode: 'normal',
        style: '',
        text: text,
        type: 'text',
        version: 1
    };
}

// Creates an empty Lexical node from the given tag name and additional attributes
function createEmptyLexicalNode(tagName, attributes = {}) {
    const nodeParams = TAG_TO_LEXICAL_NODE[tagName];
    const node = {
        children: [],
        direction: 'ltr',
        format: '',
        indent: 0,
        ...nodeParams,
        ...attributes,
        version: 1
    };
    return node;
}

// Adds a child node to a parent node
function embedChildNode(parentNode, childNode) {
    // If there is no child node, do nothing
    if (!childNode) {
        return;
    }
    // Add textNode to node's children
    parentNode.children.push(childNode);

    // If there is any text (e.g. not a blank text node), set the direction to ltr
    if (childNode && 'text' in childNode && childNode.text) {
        parentNode.direction = 'ltr';
    }
}

// Lexical stores formats as a bitmask
// Mobiledoc stores formats as a list of open markup tags
// This function converts a list of open tags to a bitmask compatible with lexical
function convertMarkupTagsToLexicalFormatBitmask(tags) {
    let format = 0;
    tags.forEach((tag) => {
        if (tag in MARKUP_TO_FORMAT) {
            format = format | MARKUP_TO_FORMAT[tag];
        }
    });
    return format;
}

function convertListSectionToLexical(child, mobiledoc) {
    const tag = child[1];
    const listType = tag === 'ul' ? 'bullet' : 'number';
    const listNode = createEmptyLexicalNode(tag, {tag, type: 'list', listType, start: 1, direction: 'ltr'});

    child[2]?.forEach((listItem, i) => {
        const listItemNode = createEmptyLexicalNode('li', {type: 'listitem', value: i + 1, direction: 'ltr'});
        populateLexicalNodeWithMarkers(listItemNode, listItem, mobiledoc);
        listNode.children.push(listItemNode);
    });

    return listNode;
}

function convertCardSectionToLexical(child, mobiledoc) {
    let [cardName, payload] = mobiledoc.cards[child[1]];

    // rename card if there's a difference between mobiledoc and lexical
    cardName = CARD_NAME_MAP[cardName] || cardName;

    // rename any properties to match lexical
    if (CARD_PROPERTY_MAP[cardName]) {
        const map = CARD_PROPERTY_MAP[cardName];

        for (const [oldName, newName] of Object.entries(map)) {
            payload[newName] = payload[oldName];
            delete payload[oldName];
        }
    }

    // run any payload fixes
    if (CARD_FIXES_MAP[cardName]) {
        payload = CARD_FIXES_MAP[cardName](payload);
    }

    delete payload.type;
    const decoratorNode = {type: cardName, ...payload};

    return decoratorNode;
}
