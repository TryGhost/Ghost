import {TextNode} from 'lexical';
import {useEffect} from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

function replacementStringTransform(node) {
    if (node.hasFormat('code')) { // prevent infinite loop
        return;
    }
    const textContent = node.getTextContent();
    // const replacementString = textContent.match(/{.*?}/)?.[0];
    const replacementString = textContent.match(/\{(\w*?)(?:,? *"(.*?)")?\}/)?.[0];

    if (!replacementString) {
        return;
    }
    // split the text content into an array including the matched string
    const splitContent = textContent.split(/({.*?})/g).filter(e => e !== '');

    // create a new text node for each string in the array
    splitContent.reverse().forEach((text) => {
        const newNode = new TextNode(text);
        if (text === replacementString) {
            newNode.setFormat('code');
            newNode.select();
        }
        node.insertAfter(newNode);
    });
    node.remove();
}

function useReplacementStrings(editor) {
    useEffect(() => {
        const removeTransform = editor.registerNodeTransform(TextNode, replacementStringTransform);
        return () => {
            removeTransform();
        };
    }, [editor]);
}

export default function ReplacementStringsPlugin() {
    const [editor] = useLexicalComposerContext();
    return useReplacementStrings(editor);
}