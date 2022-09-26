import {MarkdownShortcutPlugin as LexicalMarkdownShortcutPlugin} from '@lexical/react/LexicalMarkdownShortcutPlugin';
import {
    HEADING,
    ORDERED_LIST,
    QUOTE,
    UNORDERED_LIST,
    TEXT_FORMAT_TRANSFORMERS,
    TEXT_MATCH_TRANSFORMERS
} from '@lexical/markdown';
import {$createHorizontalRuleNode, $isHorizontalRuleNode} from '../nodes/HorizontalRuleNode';
import {$isCodeBlockNode, $createCodeBlockNode} from '../nodes/CodeBlockNode';

export const HR = {
    dependencies: [], // todo: docs a bit unclear regarding the usage of this property, but required as of 0.4.0 https://github.com/facebook/lexical/pull/2910
    export: (node) => {
        return $isHorizontalRuleNode(node) ? '---' : null;
    },
    regExp: /^(---|\*\*\*|___)\s?$/,
    replace: (parentNode, _1, _2, isImport) => {
        const line = $createHorizontalRuleNode();

        // TODO: Get rid of isImport flag
        if (isImport || parentNode.getNextSibling() != null) { // eslint-disable-line
            parentNode.replace(line);
        } else {
            parentNode.insertBefore(line);
        }

        line.selectNext();
    },
    type: 'element'
};

export const CODE_BLOCK = {
    dependencies: [], // todo: docs a bit unclear regarding the usage of this property, but required as of 0.4.0
    export: (node) => {
        if (!$isCodeBlockNode(node)) {
            return null;
        }
        const textContent = node.getTextContent();
        return (
            '```' +
            (node.getLanguage() || '') +
            (textContent ? '\n' + textContent : '') +
            '\n' +
            '```'
        );
    },
    regExp: /^```(\w{1,10})?\s/,
    replace: (textNode, match) => {
        const language = match[1];
        const codeBlockNode = $createCodeBlockNode(language);
        textNode.replace(codeBlockNode);
    },
    type: 'element'
};

export const ELEMENT_TRANSFORMERS = [
    HEADING,
    QUOTE,
    UNORDERED_LIST,
    ORDERED_LIST,
    HR,
    CODE_BLOCK
];

export const DEFAULT_TRANSFORMERS = [
    ...ELEMENT_TRANSFORMERS,
    ...TEXT_FORMAT_TRANSFORMERS,
    ...TEXT_MATCH_TRANSFORMERS
];

export default function MarkdownShortcutPlugin({transformers = DEFAULT_TRANSFORMERS}) {
    return LexicalMarkdownShortcutPlugin({transformers});
}
