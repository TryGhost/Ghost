import {
    $getSelection,
    $isRangeSelection,
    $isTextNode
} from 'lexical';
import {getSelectedNode} from '../utils/getSelectedNode.js';
import {useEffect} from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

// TODO: this update breaks the undo functionality...

export const EmEnDashPlugin = () => {
    const [editor] = useLexicalComposerContext();

    // added markdown shortcut to divider card
    useEffect(() => {
        return editor.registerUpdateListener(() => {
            editor.update(() => {
                // don't do anything when using IME input
                if (editor.isComposing()) {
                    return;
                }

                const selection = $getSelection();
                if (!$isRangeSelection(selection) || !selection.type === 'text' || !selection.isCollapsed()) {
                    return;
                }

                // need to detect regexp match for dashes
                // const genericDashRegExp = /---?.$/; // only matches end of line, not end of word/string
                const genericDashRegExp = /---?./;
                const node = getSelectedNode(selection);
                const text = node.getTextContent();
                if (!node || !$isTextNode(node) || !text?.match || !text.match(genericDashRegExp)) {
                    return;
                }

                /// ???
                const nativeSelection = window.getSelection();
                const anchorNode = nativeSelection.anchorNode;
                const rootElement = editor.getRootElement();

                if (anchorNode?.nodeType !== Node.TEXT_NODE || !rootElement.contains(anchorNode)) {
                    return;
                }

                // figure out which dash matches
                const emDashRegExp = /---([^-])/;
                const enDashRegExp = /[^-]--(\s)/;

                const emDashMatch = text.match(emDashRegExp);
                if (emDashMatch) {
                    const index = emDashMatch?.index;
                    const newText = text.slice(0,index) + '—' + text.slice(index + 3);
                    node.setTextContent(newText);
                    selection.anchor.offset = index + 2;
                    selection.focus.offset = index + 2;
                    return;
                }

                const enDashMatch = text.match(enDashRegExp);
                if (enDashMatch) {
                    const index = enDashMatch?.index;
                    const newText = text.slice(0,index + 1) + '–' + text.slice(index + 3);
                    node.setTextContent(newText);
                    selection.anchor.offset = index + 3;
                    selection.focus.offset = index + 3;
                    return;
                }

                return;
            }, {tag: 'history-merge'}); // this makes it so the transform isn't added to the undo stack - breaks undo without this
        });
    }, [editor]);

    return null;
};

export default EmEnDashPlugin;
