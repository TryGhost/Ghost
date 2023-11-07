/* eslint-disable ghost/filenames/match-exported-class */
import {$isTextNode, TextNode} from 'lexical';

// Since the TextNode is foundational to all Lexical packages, including the
// plain text use case. Handling any rich text logic is undesirable. This creates
// the need to override the TextNode to handle serialization and deserialization
// of HTML/CSS styling properties to achieve full fidelity between JSON <-> HTML.
//
// https://lexical.dev/docs/concepts/serialization#handling-extended-html-styling

export const extendedTextNodeReplacement = {replace: TextNode, with: node => new ExtendedTextNode(node.__text)};

export class ExtendedTextNode extends TextNode {
    constructor(text, key) {
        super(text, key);
    }

    static getType() {
        return 'extended-text';
    }

    static clone(node) {
        return new ExtendedTextNode(node.__text, node.__key);
    }

    static importDOM() {
        const importers = TextNode.importDOM();
        return {
            ...importers,
            span: () => ({
                conversion: patchConversion(importers?.span, convertSpanElement),
                priority: 1
            })
        };
    }

    static importJSON(serializedNode) {
        return TextNode.importJSON(serializedNode);
    }

    exportJSON() {
        const json = super.exportJSON();
        json.type = 'extended-text';
        return json;
    }

    isSimpleText() {
        return (
            (this.__type === 'text' || this.__type === 'extended-text') &&
            this.__mode === 0
        );
    }
}

function patchConversion(originalDOMConverter, convertFn) {
    return (node) => {
        const original = originalDOMConverter?.(node);
        if (!original) {
            return null;
        }
        const originalOutput = original.conversion(node);

        if (!originalOutput) {
            return originalOutput;
        }

        return {
            ...originalOutput,
            forChild: (lexicalNode, parent) => {
                const originalForChild = originalOutput?.forChild ?? (x => x);
                const result = originalForChild(lexicalNode, parent);
                if ($isTextNode(result)) {
                    return convertFn(result, node);
                }
                return result;
            }
        };
    };
}

function convertSpanElement(lexicalNode, domNode) {
    const span = domNode;

    // Word uses span tags + font-weight for bold text
    const hasBoldFontWeight = span.style.fontWeight === 'bold' || span.parentElement?.style.fontWeight === 'bold';
    // Word uses span tags + font-style for italic text
    const hasItalicFontStyle = span.style.fontStyle === 'italic' || span.parentElement?.style.fontStyle === 'italic';
    // Word uses span tags + text-decoration for underline text
    const hasUnderlineTextDecoration = span.style.textDecoration === 'underline' || span.parentElement?.style.textDecoration === 'underline';
    // Word uses span tags + "Strikethrough" class for strikethrough text
    const hasStrikethroughClass = span.classList.contains('Strikethrough') || span.parentElement?.classList.contains('Strikethrough');
    // Word uses span tags + "Highlight" class for highlighted text
    const hasHighlightClass = span.classList.contains('Highlight') || span.parentElement?.classList.contains('Highlight');

    if (hasBoldFontWeight && !lexicalNode.hasFormat('bold')) {
        lexicalNode = lexicalNode.toggleFormat('bold');
    }

    if (hasItalicFontStyle && !lexicalNode.hasFormat('italic')) {
        lexicalNode = lexicalNode.toggleFormat('italic');
    }

    if (hasUnderlineTextDecoration && !lexicalNode.hasFormat('underline')) {
        lexicalNode = lexicalNode.toggleFormat('underline');
    }

    if (hasStrikethroughClass && !lexicalNode.hasFormat('strikethrough')) {
        lexicalNode = lexicalNode.toggleFormat('strikethrough');
    }

    if (hasHighlightClass && !lexicalNode.hasFormat('highlight')) {
        lexicalNode = lexicalNode.toggleFormat('highlight');
    }

    return lexicalNode;
}
