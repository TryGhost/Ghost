import Browser from 'mobiledoc-kit/utils/browser';

// Key commands will run any time a particular key or key combination is pressed
// https://github.com/bustlelabs/mobiledoc-kit#configuring-hot-keys

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
}, {
    str: 'CTRL+K',
    run(editor, koenig) {
        if (Browser.isWin()) {
            return koenig.send('editLink', editor.range);
        }

        // default behaviour for Mac is delete to end of section
        return false;
    }
}, {
    str: 'META+K',
    run(editor, koenig) {
        return koenig.send('editLink', editor.range);
    }
}];

export default function registerKeyCommands(editor, koenig) {
    DEFAULT_KEY_COMMANDS.forEach((keyCommand) => {
        editor.registerKeyCommand({
            str: keyCommand.str,
            run() {
                keyCommand.run(editor, koenig);
            }
        });
    });
}
