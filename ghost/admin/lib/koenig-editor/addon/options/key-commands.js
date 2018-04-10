// Key commands will run any time a particular key or key combination is pressed
// https://github.com/bustlelabs/mobiledoc-kit#configuring-hot-keys

export default function (editor) {
    let softReturnKeyCommand = {
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
    };
    editor.registerKeyCommand(softReturnKeyCommand);
}
