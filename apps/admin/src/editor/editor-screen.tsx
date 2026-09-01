/**
 * Placeholder for the React editor, served behind the `editorReact` Labs
 * flag. It only proves the EditorGate cutover seam end to end; the editor
 * itself still lives in Ember while the flag is off.
 */
export default function EditorScreen() {
  return (
    <div className="flex h-full items-center justify-center" data-testid="editor-react-placeholder">
      <p className="text-sm text-muted-foreground">
        The React editor is under construction. Turn off the “React editor” flag in Labs to use the
        editor.
      </p>
    </div>
  );
}
