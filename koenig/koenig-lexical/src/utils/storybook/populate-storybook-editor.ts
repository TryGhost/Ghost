import generateEditorState from '../generateEditorState';
import type {LexicalEditor} from 'lexical';

export default function populateEditor({editor, initialHtml}: {editor: LexicalEditor; initialHtml?: string}) {
    generateEditorState({editor, initialHtml});
}
