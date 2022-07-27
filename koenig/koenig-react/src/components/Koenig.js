import * as React from 'react';
import {Editor, Container, Toolbar} from 'react-mobiledoc-editor';
import DEFAULT_ATOMS from '../atoms';
import DEFAULT_KEY_COMMANDS from '../key-commands';

const Koenig = ({
    mobiledoc,
    atoms = DEFAULT_ATOMS,
    keyCommands = DEFAULT_KEY_COMMANDS,
    didCreateEditor,
    onChange
}) => {
    function _didCreateEditor(editor) {
        if (keyCommands?.length) {
            keyCommands.forEach((command) => {
                editor.registerKeyCommand({
                    str: command.str,
                    run() {
                        return command.run(editor);
                    }
                });
            });
        }

        didCreateEditor?.(editor);
    }

    return (
        <Container
            className="my-2 px-2 md:mx-auto md:my-16 max-w-xl w-full"
            mobiledoc={mobiledoc}
            atoms={atoms}
            onChange={onChange}
            didCreateEditor={_didCreateEditor}
        >
            <Toolbar className="flex" />
            <Editor className="prose"/>
        </Container>
    );
};

export default Koenig;
