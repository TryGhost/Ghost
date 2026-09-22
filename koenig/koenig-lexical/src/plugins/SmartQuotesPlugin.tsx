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
import {findMistypedLeadingApostrophe, getSmartQuote, smartenQuotes} from '../utils/smart-quotes';
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

    // we only need to act on quotes, or on word boundaries where we may need to correct
    // a ‘ that turned out to be a leading apostrophe, e.g. ‘90s -> ’90s
    if (!isQuote && isWordCharacter) {
        return false;
    }

    const selection = $getSelection();
    if (!$isRangeSelection(selection)) {
        return false;
    }

    // the caret may have moved without Lexical having processed the selectionchange yet
    const domSelection = window.getSelection();
    if (domSelection && domSelection.rangeCount > 0) {
        selection.applyDOMRange(domSelection.getRangeAt(0));
    }

    const textBefore = $getTextBeforeSelection(selection);
    if (textBefore === null || isInsideCodeOrReplacementString(selection, textBefore)) {
        return false;
    }

    let fixedApostrophe = false;
    if (selection.isCollapsed() && $isTextNode(selection.anchor.getNode())) {
        const anchorNode = selection.anchor.getNode() as TextNode;
        const nodeTextBefore = anchorNode.getTextContent().slice(0, selection.anchor.offset);
        const apostropheIndex = findMistypedLeadingApostrophe(nodeTextBefore);
        if (apostropheIndex !== -1) {
            anchorNode.spliceText(apostropheIndex, 1, getSmartQuote('\'', 'x'), false);
            fixedApostrophe = true;
        }
    }

    if (!isQuote && !fixedApostrophe) {
        return false;
    }

    event.preventDefault();
    selection.insertText(isQuote ? getSmartQuote(event.key, textBefore.slice(-1)) : event.key);
    return true;
}

function $smartenPastedText(node: TextNode) {
    if (!$hasUpdateTag(SMART_QUOTES_PASTE_TAG) || node.hasFormat('code')) {
        return;
    }

    const text = node.getTextContent();
    const newText = smartenQuotes(text, $getTextBeforeNode(node).slice(-1));

    // quotes are always replaced by a single character so any selection offsets stay valid
    if (newText !== text) {
        node.setTextContent(newText);
    }
}

export const SmartQuotesPlugin = () => {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
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
            editor.registerNodeTransform(TextNode, $smartenPastedText),
            // nested editors may not have ExtendedTextNode registered
            editor.hasNode(ExtendedTextNode) ? editor.registerNodeTransform(ExtendedTextNode, $smartenPastedText) : () => {}
        );
    }, [editor]);

    return null;
};

export default SmartQuotesPlugin;
