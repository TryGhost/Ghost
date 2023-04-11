import {$createParagraphNode} from 'lexical';
import {$generateNodesFromDOM} from '@lexical/html';
import {$getRoot, $insertNodes} from 'lexical';

export default function generateEditorState({editor, initialHtml}) {
    if (initialHtml) {
        // convert html in `text` to Lexical nodes and populate the editor
        editor.update(() => {
            const parser = new DOMParser();
            const dom = parser.parseFromString(initialHtml, 'text/html');

            const nodes = $generateNodesFromDOM(editor, dom);

            let isEmpty = true;
            nodes.forEach((n) => {
                // There are few recent issues related to $generateNodesFromDOM
                // https://github.com/facebook/lexical/issues/2807
                // https://github.com/facebook/lexical/issues/3677
                // As a temporary fix, checking node content to remove additional spaces and br
                if (n.getTextContent().trim()) {
                    isEmpty = false;
                }
            });

            // Select the root
            $getRoot().select();

            if (isEmpty) {
                $getRoot().clear();
            }

            // Insert them at a selection.
            $insertNodes(nodes);
        }, {discrete: true});
    } else {
        // for empty initial values, create a paragraph because a completely empty
        // root won't accept focus
        editor.update(() => {
            $getRoot().append($createParagraphNode());
        }, {discrete: true});
    }

    return JSON.stringify(editor.getEditorState());
}
