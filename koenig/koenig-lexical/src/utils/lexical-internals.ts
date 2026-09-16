import type {EditorState, LexicalEditor} from 'lexical';

// Lexical does not expose public APIs for a few editor relationships and node
// registry details that Koenig needs. Keep those private-field reads isolated
// here so version-specific assumptions are named and easy to audit when
// upgrading Lexical.

export function getParentEditor(editor: LexicalEditor): LexicalEditor | null {
    return editor._parentEditor ?? null;
}

export function getPendingEditorState(editor: LexicalEditor): EditorState | null {
    return editor._pendingEditorState ?? null;
}

export function getRegisteredNodeClasses(editor: LexicalEditor): Iterable<[string, {klass: unknown}]> {
    return editor._nodes;
}
