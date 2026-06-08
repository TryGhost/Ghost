import {useCallback, useEffect, useRef, useState} from 'react';

export type QuoteSelection = {
    html: string;
    left: number;
    top: number;
};

type QuoteSelectionEntry = {
    clear: () => void;
    contentElement: HTMLDivElement;
    update: () => void;
};

function getNodeElement(node: Node) {
    return node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement;
}

function isBlockElement(node: Node) {
    return node.nodeType === Node.ELEMENT_NODE && ['BLOCKQUOTE', 'P'].includes((node as Element).tagName);
}

function appendNormalizedSelectionNode(output: HTMLDivElement, node: Node, inlineWrapper: {current: HTMLParagraphElement | null}) {
    if (isBlockElement(node)) {
        inlineWrapper.current = null;
        output.appendChild(node);
        return;
    }

    if (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()) {
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

    return Array.from(entries).find(({contentElement}) => (
        contentElement.contains(startElement) && contentElement.contains(endElement)
    )) ?? null;
}

function isRangeInsideElement(range: Range, element: Element) {
    const startElement = getNodeElement(range.startContainer);
    const endElement = getNodeElement(range.endContainer);

    return !!startElement && !!endElement && element.contains(startElement) && element.contains(endElement);
}

function createQuoteSelectionManager(ownerDocument: Document) {
    const ownerWindow = ownerDocument.defaultView || window;
    const entries = new Set<QuoteSelectionEntry>();
    let activeEntry: QuoteSelectionEntry | null = null;

    const clearActiveEntry = () => {
        activeEntry?.clear();
        activeEntry = null;
    };

    const updateActiveEntry = () => {
        const nextActiveEntry = getEntryForSelection(entries, ownerDocument);

        if (!nextActiveEntry) {
            clearActiveEntry();
            return;
        }

        if (activeEntry && activeEntry !== nextActiveEntry) {
            activeEntry.clear();
        }

        activeEntry = nextActiveEntry;
        activeEntry.update();
    };

    const updateAfterSelectionSettles = () => {
        ownerWindow.setTimeout(updateActiveEntry, 0);
    };

    ownerDocument.addEventListener('selectionchange', updateActiveEntry);
    ownerDocument.addEventListener('mouseup', updateAfterSelectionSettles);
    ownerDocument.addEventListener('touchend', updateAfterSelectionSettles);
    ownerWindow.addEventListener('resize', clearActiveEntry);
    ownerWindow.addEventListener('scroll', clearActiveEntry, true);

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
            ownerWindow.removeEventListener('resize', clearActiveEntry);
            ownerWindow.removeEventListener('scroll', clearActiveEntry, true);
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

    const updateQuoteSelection = useCallback(() => {
        const contentElement = contentRef.current;

        if (!contentElement || disabled) {
            clearQuoteSelection();
            return;
        }

        const ownerDocument = contentElement.ownerDocument;
        const selection = ownerDocument.getSelection();

        if (!selection || selection.isCollapsed || selection.rangeCount !== 1 || !selection.toString().trim()) {
            clearQuoteSelection();
            return;
        }

        const range = selection.getRangeAt(0);

        if (!isRangeInsideElement(range, contentElement)) {
            clearQuoteSelection();
            return;
        }

        const quoteHtml = getSelectionHtml(range);

        if (!quoteHtml) {
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

        setQuoteSelection({
            html: quoteHtml,
            left: rect.left + (rect.width / 2),
            top: rect.top - 8
        });
    }, [clearQuoteSelection, disabled]);

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
        quoteSelection
    };
}
