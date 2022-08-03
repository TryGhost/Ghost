class KoenigEditor {
    constructor(mobiledocEditor, {keyCommands, textExpansions} = {}) {
        this.mobiledocEditor = mobiledocEditor;

        if (keyCommands?.length) {
            keyCommands.forEach((command) => {
                this.mobiledocEditor.registerKeyCommand({
                    str: command.str,
                    run() {
                        return command.run(this.mobiledocEditor);
                    }
                });
            });
        }

        if (textExpansions?.length) {
            textExpansions.forEach((textExpansionFactory) => {
                const textExpansion = textExpansionFactory(this);
                textExpansion.unregister?.forEach(key => this.mobiledocEditor.unregisterTextInputHandler(key));
                textExpansion.register?.forEach(expansion => this.mobiledocEditor.onTextInput(expansion));
            });
        }
    }
}

export default KoenigEditor;
