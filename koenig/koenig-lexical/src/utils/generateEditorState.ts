import {$createParagraphNode, $setSelection} from 'lexical';
import {$generateNodesFromDOM} from '@lexical/html';
import {$getRoot, $insertNodes} from 'lexical';

// exported for testing
export function _$generateNodesFromHTML(editor, html) {
    const parser = new DOMParser();
    const dom = parser.parseFromString(html, 'text/html');
    const nodes = $generateNodesFromDOM(editor, dom);
    return nodes;
}

export default function generateEditorState({editor, initialHtml}) {
    if (initialHtml) {
        // convert html in `text` to Lexical nodes and populate the editor
        editor.update(() => {
            const nodes = _$generateNodesFromHTML(editor, initialHtml);

            // Select the root
            $getRoot().select();
            // Clear existing content (we initialize an editor with an empty p node so it is focusable if there's no content)
            $getRoot().clear();

            // Insert them at a selection.
            $insertNodes(nodes);

            // $insertNodes is focusing an editor (https://github.com/facebook/lexical/issues/4546)
            // This behaviour can break the ability to autofocus the editor because
            // initial state filling can happen after the component is already mounted.
            // Reset selection to make it easier to manage editor focus in components instead of editor state generation
            if (nodes.length) {
                $setSelection(null);
            }
        }, {discrete: true, tag: 'history-merge'}); // use history merge to prevent undo clearing the initial state
    } else {
        // for empty initial values, create a paragraph because a completely empty
        // root won't accept focus
        editor.update(() => {
            $getRoot().append($createParagraphNode());
        }, {discrete: true, tag: 'history-merge'}); // use history merge to prevent undo clearing the initial state
    }

    return editor.getEditorState();
}
