import generateEditorState from '../generateEditorState';
import type {EditorState} from 'lexical';
import type {GenerateEditorStateOptions} from '../generateEditorState';

export default function populateEditor(options: GenerateEditorStateOptions): EditorState {
    return generateEditorState(options);
}
