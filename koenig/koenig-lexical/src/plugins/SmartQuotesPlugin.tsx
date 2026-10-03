import {
    $addUpdateTag,
    $getSelection,
    $hasUpdateTag,
    $isElementNode,
    $isLineBreakNode,
    $isRangeSelection,
    $isTextNode,
    COMMAND_PRIORITY_HIGH,
    KEY_DOWN_COMMAND,
    LexicalEditor,
    LexicalNode,
    PASTE_COMMAND,
    RangeSelection,
    TextNode
} from 'lexical';
import {ExtendedTextNode} from '@tryghost/kg-default-nodes';
import {findMistypedQuote, getSmartQuote, smartenQuotes} from '../utils/smart-quotes';
import {mergeRegister} from '@lexical/utils';
import {useEffect} from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

// Replaces straight quotes with curly quotes and apostrophes as you type or paste
// following https://smartquotesforsmartpeople.com

const SMART_QUOTES_PASTE_TAG = 'smart-quotes-paste';

// text that precedes a node within the same paragraph/heading, crossing inline formatting and links
function $getTextBeforeNode(node: LexicalNode): string {
    let text = '';
    let current: LexicalNode | null = node;

    while (current) {
        let sibling = current.getPreviousSibling();
        while (sibling) {
            if ($isLineBreakNode(sibling)) {
                return '\n' + text;
            }
            text = sibling.getTextContent() + text;
            sibling = sibling.getPreviousSibling();
        }

        const parent = current.getParent();
        if (!parent || !parent.isInline()) {
            break;
        }
        current = parent;
    }

    return text;
}

function $getTextBeforeSelection(selection: RangeSelection): string | null {
    const start = selection.isBackward() ? selection.focus : selection.anchor;
    const node = start.getNode();

    if ($isTextNode(node)) {
        return $getTextBeforeNode(node) + node.getTextContent().slice(0, start.offset);
    }

    // caret in an empty paragraph or between inline elements
    if ($isElementNode(node)) {
        return node.getChildren().slice(0, start.offset).map(child => child.getTextContent()).join('');
    }

    return null;
}

// don't touch code (including a `code span that's still being typed) or Ghost's {replacement, "strings"}
function isInsideCodeOrReplacementString(selection: RangeSelection, textBefore: string): boolean {
    return selection.hasFormat('code') || /`[^`]*$/.test(textBefore) || /\{[^}]*$/.test(textBefore);
}

function $handleKeyDown(event: KeyboardEvent, editor: LexicalEditor): boolean {
    if (
        event.defaultPrevented ||
        event.isComposing ||
        event.ctrlKey ||
        event.metaKey ||
        event.key.length !== 1 ||
        // ignore key presses inside card inputs, CodeMirror etc
        event.target !== editor.getRootElement()
    ) {
        return false;
    }

    const isQuote = event.key === '"' || event.key === '\'';
    const isWordCharacter = /[\p{L}\p{N}]/u.test(event.key);
    const domSelection = window.getSelection();

    // besides quotes we only need to act where a quote typed earlier turned out to be wrong:
    // at the end of a word for ‘90s -> ’90s, or on a letter after a digit for 1990′s -> 1990’s.
    // Check the DOM first so ordinary typing stays cheap.
    if (!isQuote && isWordCharacter) {
        const domTextBefore = domSelection?.anchorNode?.textContent?.slice(0, domSelection.anchorOffset) ?? '';
        if (!/\d\u2032$/.test(domTextBefore)) {
            return false;
        }
    }

    const selection = $getSelection();
    if (!$isRangeSelection(selection)) {
        return false;
    }

    // the caret may have moved without Lexical having processed the selectionchange yet
    if (domSelection && domSelection.rangeCount > 0) {
        selection.applyDOMRange(domSelection.getRangeAt(0));
    }

    let textBefore = $getTextBeforeSelection(selection);
    if (textBefore === null || isInsideCodeOrReplacementString(selection, textBefore)) {
        return false;
    }

    const fixedQuote = selection.isCollapsed() && $fixMistypedQuote(selection, event.key);
    if (fixedQuote) {
        textBefore = $getTextBeforeSelection(selection) ?? textBefore;
    }

    if (!isQuote && !fixedQuote) {
        return false;
    }

    event.preventDefault();
    selection.insertText(isQuote ? getSmartQuote(event.key, textBefore) : event.key);
    return true;
}

// corrects a quote typed before we knew what followed it, e.g. ‘90s -> ’90s
function $fixMistypedQuote(selection: RangeSelection, nextChar: string): boolean {
    const node = selection.anchor.getNode();
    if (!$isTextNode(node)) {
        return false;
    }

    const fix = findMistypedQuote(node.getTextContent().slice(0, selection.anchor.offset), nextChar);
    if (!fix) {
        return false;
    }

    node.spliceText(fix.index, 1, fix.replacement, false);
    return true;
}

// Dead keys (e.g. US-International) and IMEs insert quotes through a composition rather than a
// keydown we can intercept, so convert the quote once the composed text has been inserted
function $smartenComposedQuote(quote: string): boolean {
    const selection = $getSelection();
    if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
        return false;
    }

    const node = selection.anchor.getNode();
    const offset = selection.anchor.offset;
    if (!$isTextNode(node) || node.getTextContent().charAt(offset - 1) !== quote) {
        return false;
    }

    const textBefore = $getTextBeforeNode(node) + node.getTextContent().slice(0, offset - 1);
    if (isInsideCodeOrReplacementString(selection, textBefore)) {
        return true;
    }

    node.spliceText(offset - 1, 1, getSmartQuote(quote, textBefore), true);
    $fixMistypedQuote(selection, quote);
    return true;
}

function $smartenPastedText(node: TextNode) {
    if (!$hasUpdateTag(SMART_QUOTES_PASTE_TAG) || node.hasFormat('code')) {
        return;
    }

    const text = node.getTextContent();
    const newText = smartenQuotes(text, $getTextBeforeNode(node));

    // quotes are always replaced by a single character so any selection offsets stay valid
    if (newText !== text) {
        node.setTextContent(newText);
    }
}

export const SmartQuotesPlugin = () => {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        const onCompositionEnd = (event: CompositionEvent) => {
            const quote = event.data;
            if (quote !== '"' && quote !== '\'') {
                return;
            }
            // Chrome and Safari have inserted the composed text by now but Firefox inserts it
            // after compositionend, so try again on the next tick if the quote isn't there yet.
            // history-merge keeps the conversion in the same undo step as the typed quote
            editor.update(() => {
                if (!$smartenComposedQuote(quote)) {
                    setTimeout(() => {
                        editor.update(() => $smartenComposedQuote(quote), {tag: 'history-merge'});
                    });
                }
            }, {tag: 'history-merge'});
        };

        return mergeRegister(
            editor.registerCommand(
                KEY_DOWN_COMMAND,
                (event, dispatchingEditor) => $handleKeyDown(event, dispatchingEditor),
                COMMAND_PRIORITY_HIGH
            ),
            // tag the paste update so we only convert pasted text and not all existing content
            editor.registerCommand(
                PASTE_COMMAND,
                () => {
                    $addUpdateTag(SMART_QUOTES_PASTE_TAG);
                    return false;
                },
                COMMAND_PRIORITY_HIGH
            ),
            editor.registerRootListener((rootElement, prevRootElement) => {
                prevRootElement?.removeEventListener('compositionend', onCompositionEnd);
                rootElement?.addEventListener('compositionend', onCompositionEnd);
            }),
            () => editor.getRootElement()?.removeEventListener('compositionend', onCompositionEnd),
            editor.registerNodeTransform(TextNode, $smartenPastedText),
            // nested editors may not have ExtendedTextNode registered
            editor.hasNode(ExtendedTextNode) ? editor.registerNodeTransform(ExtendedTextNode, $smartenPastedText) : () => {}
        );
    }, [editor]);

    return null;
};

export default SmartQuotesPlugin;
