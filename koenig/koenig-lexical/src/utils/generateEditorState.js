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

            // There are few recent issues related to $generateNodesFromDOM
            // https://github.com/facebook/lexical/issues/2807
            // https://github.com/facebook/lexical/issues/3677
            // As a temporary fix, checking node content to remove additional spaces and br
            const filteredNodes = nodes.filter(n => n.getTextContent().trim());

            // Select the root
            $getRoot().select();

            if (filteredNodes.length === 0) {
                $getRoot().clear();
            }

            // Insert them at a selection.
            $insertNodes(filteredNodes);
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
