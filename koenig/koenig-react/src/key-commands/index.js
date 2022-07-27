export const DEFAULT_KEY_COMMANDS = [{
    str: 'SHIFT+ENTER',
    run(editor) {
        if (!editor.range.headSection.isMarkerable) {
            return;
        }

        editor.run((postEditor) => {
            let softReturn = postEditor.builder.createAtom('soft-return');
            postEditor.insertMarkers(editor.range.head, [softReturn]);
        });
    }
}];

export default DEFAULT_KEY_COMMANDS;
