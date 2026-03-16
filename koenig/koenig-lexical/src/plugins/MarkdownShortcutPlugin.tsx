import {$createCodeBlockNode, $isCodeBlockNode, CodeBlockNode} from '../nodes/CodeBlockNode';
import {$createHorizontalRuleNode, $isHorizontalRuleNode, HorizontalRuleNode} from '../nodes/HorizontalRuleNode';
import {$createImageNode, $isImageNode, ImageNode} from '../nodes/ImageNode';
import {$createNodeSelection, $setSelection} from 'lexical';
import {
    HEADING,
    ORDERED_LIST,
    QUOTE,
    TEXT_FORMAT_TRANSFORMERS,
    TEXT_MATCH_TRANSFORMERS,
    UNORDERED_LIST
} from '@lexical/markdown';
import {MarkdownShortcutPlugin as LexicalMarkdownShortcutPlugin} from '@lexical/react/LexicalMarkdownShortcutPlugin';
import type {ElementNode, LexicalNode} from 'lexical';
import type {ElementTransformer, Transformer} from '@lexical/markdown';

export const HR: ElementTransformer = {
    dependencies: [HorizontalRuleNode],
    export: (node: LexicalNode) => {
        return $isHorizontalRuleNode(node) ? '---' : null;
    },
    regExp: /^(---|\*\*\*|___)\s?$/,
    replace: (parentNode: ElementNode, _1: LexicalNode[], _2: string[], isImport: boolean) => {
        const line = $createHorizontalRuleNode();

        // TODO: Get rid of isImport flag
        if (isImport || parentNode.getNextSibling() != null) {
            parentNode.replace(line);
        } else {
            parentNode.insertBefore(line);
        }

        line.selectNext();
    },
    type: 'element'
};

export const CODE_BLOCK: ElementTransformer = {
    dependencies: [CodeBlockNode],
    export: (node: LexicalNode) => {
        if (!$isCodeBlockNode(node)) {
            return null;
        }
        const textContent = node.getTextContent();
        return (
            '```' +
            (node.language || '') +
            (textContent ? '\n' + textContent : '') +
            '\n' +
            '```'
        );
    },
    regExp: /^```(\w{1,10})?\s/,
    replace: (textNode: ElementNode, _match: LexicalNode[], text: string[]) => {
        const language = text[1];
        const codeBlockNode = $createCodeBlockNode({language, _openInEditMode: true});
        const replacementNode = textNode.replace(codeBlockNode);

        // select node when replacing so it immediately renders in editing mode
        const replacementSelection = $createNodeSelection();
        replacementSelection.add(replacementNode.getKey());
        $setSelection(replacementSelection);
    },
    type: 'element'
};

// render imageNode when writing image!
// regex that detects exactly the string 'image!'

export const IMAGE: ElementTransformer = {
    dependencies: [ImageNode],
    export: (node: LexicalNode) => {
        if (!$isImageNode(node)){
            return null;
        } else {
            const {src, alt} = (node as ImageNode).getDataset() as {src: string; alt: string};
            return `![${alt}](${src})`;
        }
    },
    regExp: /^image! $/,
    replace: (parentNode: ElementNode) => {
        const alt = '';
        const src = '';
        const imageNode = $createImageNode({altText: alt, src});
        parentNode.replace(imageNode);
    },
    type: 'element'
};

// custom text format transformers
export const SUBSCRIPT = {
    format: ['subscript'],
    tag: '~',
    type: 'text-format'
};

export const SUPERSCRIPT = {
    format: ['superscript'],
    tag: '^',
    type: 'text-format'
};

export const ELEMENT_TRANSFORMERS = [
    HEADING,
    QUOTE,
    UNORDERED_LIST,
    ORDERED_LIST,
    HR,
    CODE_BLOCK,
    IMAGE
];

export const CUSTOM_TEXT_FORMAT_TRANSFORMERS = [
    SUBSCRIPT,
    SUPERSCRIPT
];

export const DEFAULT_TRANSFORMERS: Transformer[] = [
    ...ELEMENT_TRANSFORMERS,
    ...TEXT_FORMAT_TRANSFORMERS,
    ...CUSTOM_TEXT_FORMAT_TRANSFORMERS as Transformer[],
    ...TEXT_MATCH_TRANSFORMERS
];

export const MINIMAL_TRANSFORMERS: Transformer[] = [
    ...TEXT_FORMAT_TRANSFORMERS,
    ...CUSTOM_TEXT_FORMAT_TRANSFORMERS as Transformer[],
    ...TEXT_MATCH_TRANSFORMERS
];

export const BASIC_TRANSFORMERS: Transformer[] = [
    UNORDERED_LIST,
    ORDERED_LIST,
    ...TEXT_FORMAT_TRANSFORMERS,
    ...CUSTOM_TEXT_FORMAT_TRANSFORMERS as Transformer[],
    ...TEXT_MATCH_TRANSFORMERS
];

export const EMAIL_TRANSFORMERS: Transformer[] = [
    HEADING,
    QUOTE,
    UNORDERED_LIST,
    ORDERED_LIST,
    HR,
    ...TEXT_FORMAT_TRANSFORMERS,
    ...CUSTOM_TEXT_FORMAT_TRANSFORMERS as Transformer[],
    ...TEXT_MATCH_TRANSFORMERS
];

export default function MarkdownShortcutPlugin({transformers = DEFAULT_TRANSFORMERS}: {transformers?: Transformer[]} = {}) {
    return LexicalMarkdownShortcutPlugin({transformers});
}
