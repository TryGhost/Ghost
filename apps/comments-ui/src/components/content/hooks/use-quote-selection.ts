import {useCallback, useEffect, useRef, useState} from 'react';

export type QuoteSelection = {
    left: number;
    top: number;
};

type QuoteSelectionEntry = {
    clear: () => void;
    contentElement: HTMLDivElement;
    update: (range: Range) => void;
};

function getNodeElement(node: Node) {
    return node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement;
}

// NOTE: only <p> and <blockquote> are treated as block-level here. Any other
// block the comment HTML might contain (lists, headings, <pre>, ...) falls
// through to the inline branch below and gets wrapped in a <p>, which can
// produce invalid markup. Kept narrow on the assumption comment bodies only
// ever contain these two block types — revisit if that schema widens.
function isBlockElement(node: Node) {
    return node.nodeType === Node.ELEMENT_NODE && ['BLOCKQUOTE', 'P'].includes((node as Element).tagName);
}

// Normalises a raw selection fragment into clean block-level HTML: loose inline
// nodes (text, <a>, <strong>, ...) are collected into a shared <p> wrapper while
// existing blocks are passed through untouched. This guarantees the reply
// editor's ProseMirror schema can parse the quote as a valid blockquote body.
function appendNormalizedSelectionNode(output: HTMLDivElement, node: Node, inlineWrapper: {current: HTMLParagraphElement | null}) {
    if (isBlockElement(node)) {
        inlineWrapper.current = null;
        output.appendChild(node);
        return;
    }

    // Drop whitespace-only text nodes between blocks (e.g. the newline between
    // two <p>s), but keep them while an inline wrapper is open: the space
    // between two adjacent inline elements (<a>x</a> <a>y</a>) is significant.
    if (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim() && !inlineWrapper.current) {
        return;
    }

    if (!inlineWrapper.current) {
        inlineWrapper.current = output.ownerDocument.createElement('p');
        output.appendChild(inlineWrapper.current);
    }

    inlineWrapper.current.appendChild(node);
}

function getSelectionHtml(range: Range) {
    const ownerDocument = range.startContainer.ownerDocument || document;
    const container = ownerDocument.createElement('div');
    container.appendChild(range.cloneContents());

    const output = ownerDocument.createElement('div');
    const inlineWrapper = {current: null as HTMLParagraphElement | null};

    Array.from(container.childNodes).forEach((node) => {
        appendNormalizedSelectionNode(output, node, inlineWrapper);
    });

    return output.innerHTML.trim();
}

function getEntryForSelection(entries: Set<QuoteSelectionEntry>, ownerDocument: Document) {
    const selection = ownerDocument.getSelection();

    if (!selection || selection.isCollapsed || selection.rangeCount !== 1 || !selection.toString().trim()) {
        return null;
    }

    const range = selection.getRangeAt(0);
    const startElement = getNodeElement(range.startContainer);
    const endElement = getNodeElement(range.endContainer);

    if (!startElement || !endElement) {
        return null;
    }

    const entry = Array.from(entries).find(({contentElement}) => (
        contentElement.contains(startElement) && contentElement.contains(endElement)
    ));

    return entry ? {entry, range} : null;
}

function isRangeInsideElement(range: Range, element: Element) {
    const startElement = getNodeElement(range.startContainer);
    const endElement = getNodeElement(range.endContainer);

    return !!startElement && !!endElement && element.contains(startElement) && element.contains(endElement);
}

// A single manager per document owns the global selection listeners and tracks
// every mounted comment body as an "entry". Centralising here (rather than one
// set of document listeners per comment) keeps listener count flat regardless of
// thread size and lets us enforce a single active quote button across all
// comments — and reject selections that span more than one comment body.
function createQuoteSelectionManager(ownerDocument: Document) {
    const ownerWindow = ownerDocument.defaultView || window;
    const entries = new Set<QuoteSelectionEntry>();
    let activeEntry: QuoteSelectionEntry | null = null;

    const clearActiveEntry = () => {
        activeEntry?.clear();
        activeEntry = null;
    };

    const updateActiveEntry = () => {
        const match = getEntryForSelection(entries, ownerDocument);

        if (!match) {
            clearActiveEntry();
            return;
        }

        if (activeEntry && activeEntry !== match.entry) {
            activeEntry.clear();
        }

        activeEntry = match.entry;
        activeEntry.update(match.range);
    };

    const updateAfterSelectionSettles = () => {
        ownerWindow.setTimeout(updateActiveEntry, 0);
    };

    // Scrolling/resizing can move an existing selection but never create one, so
    // skip the selection validation and entry scan entirely while no button is up.
    const repositionActiveEntry = () => {
        if (!activeEntry) {
            return;
        }

        updateActiveEntry();
    };

    ownerDocument.addEventListener('selectionchange', updateActiveEntry);
    ownerDocument.addEventListener('mouseup', updateAfterSelectionSettles);
    ownerDocument.addEventListener('touchend', updateAfterSelectionSettles);
    // Reposition (rather than dismiss) on scroll/resize: the button is fixed-
    // positioned from the selection's viewport rect, so it has to track the
    // selection as it moves. Dismissing would also be fragile — browsers scroll
    // programmatically (focus, scrollIntoView) right around the moments users
    // make selections, which would permanently hide the button since the
    // selection itself never re-fires selectionchange.
    ownerWindow.addEventListener('resize', repositionActiveEntry);
    ownerWindow.addEventListener('scroll', repositionActiveEntry, true);

    return {
        register(entry: QuoteSelectionEntry) {
            entries.add(entry);
        },

        unregister(entry: QuoteSelectionEntry) {
            entries.delete(entry);

            if (activeEntry === entry) {
                activeEntry = null;
            }
        },

        isEmpty() {
            return entries.size === 0;
        },

        destroy() {
            ownerDocument.removeEventListener('selectionchange', updateActiveEntry);
            ownerDocument.removeEventListener('mouseup', updateAfterSelectionSettles);
            ownerDocument.removeEventListener('touchend', updateAfterSelectionSettles);
            ownerWindow.removeEventListener('resize', repositionActiveEntry);
            ownerWindow.removeEventListener('scroll', repositionActiveEntry, true);
        }
    };
}

const quoteSelectionManagers = new WeakMap<Document, ReturnType<typeof createQuoteSelectionManager>>();

function getQuoteSelectionManager(ownerDocument: Document) {
    const existingManager = quoteSelectionManagers.get(ownerDocument);

    if (existingManager) {
        return existingManager;
    }

    const manager = createQuoteSelectionManager(ownerDocument);
    quoteSelectionManagers.set(ownerDocument, manager);
    return manager;
}

export function useQuoteSelection({disabled}: {disabled: boolean}) {
    const contentRef = useRef<HTMLDivElement | null>(null);
    const [quoteSelection, setQuoteSelection] = useState<QuoteSelection | null>(null);

    const clearQuoteSelection = useCallback(() => {
        setQuoteSelection(null);
    }, []);

    // Runs on every selection/scroll event while a selection is active, so it
    // only reads the selection rect. Serializing the selected HTML is deferred
    // to getQuoteHtml (called once, on button click).
    const updateQuoteSelection = useCallback((range: Range) => {
        const contentElement = contentRef.current;

        if (!contentElement || disabled) {
            clearQuoteSelection();
            return;
        }

        let rect = range.getBoundingClientRect();

        if (rect.width === 0 && rect.height === 0) {
            rect = range.getClientRects()[0];
        }

        if (!rect) {
            clearQuoteSelection();
            return;
        }

        const left = rect.left + (rect.width / 2);
        const top = rect.top - 8;

        // Keep the previous object when the position is unchanged so React can
        // bail out of re-rendering the comment body.
        setQuoteSelection(previous => (
            previous && previous.left === left && previous.top === top
                ? previous
                : {left, top}
        ));
    }, [clearQuoteSelection, disabled]);

    // Serializes the current selection into normalized quote HTML. Returns null
    // when there is no valid selection inside this comment body.
    const getQuoteHtml = useCallback(() => {
        const contentElement = contentRef.current;

        if (!contentElement || disabled) {
            return null;
        }

        const selection = contentElement.ownerDocument.getSelection();

        if (!selection || selection.isCollapsed || selection.rangeCount !== 1 || !selection.toString().trim()) {
            return null;
        }

        const range = selection.getRangeAt(0);

        if (!isRangeInsideElement(range, contentElement)) {
            return null;
        }

        return getSelectionHtml(range) || null;
    }, [disabled]);

    useEffect(() => {
        const contentElement = contentRef.current;

        if (!contentElement) {
            return;
        }

        if (disabled) {
            clearQuoteSelection();
            return;
        }

        const ownerDocument = contentElement.ownerDocument;
        const manager = getQuoteSelectionManager(ownerDocument);
        const entry: QuoteSelectionEntry = {
            clear: clearQuoteSelection,
            contentElement,
            update: updateQuoteSelection
        };

        manager.register(entry);

        return () => {
            manager.unregister(entry);

            if (manager.isEmpty()) {
                manager.destroy();
                quoteSelectionManagers.delete(ownerDocument);
            }
        };
    }, [clearQuoteSelection, disabled, updateQuoteSelection]);

    return {
        clearQuoteSelection,
        contentRef,
        getQuoteHtml,
        quoteSelection
    };
}
