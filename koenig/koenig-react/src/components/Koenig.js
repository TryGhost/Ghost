import * as React from 'react';
import {Container, Toolbar, Editor} from 'react-mobiledoc-editor';
import DEFAULT_ATOMS from '../atoms';
import DEFAULT_KEY_COMMANDS from '../key-commands';
import DEFAULT_TEXT_EXPANSIONS from '../text-expansions';

const Koenig = ({
    mobiledoc,
    atoms = DEFAULT_ATOMS,
    keyCommands = DEFAULT_KEY_COMMANDS,
    textExpansions = DEFAULT_TEXT_EXPANSIONS,
    didCreateEditor,
    onChange
}) => {
    const [editorInstance, setEditorInstance] = React.useState(null);
    const [coords, setCoords] = React.useState({x: 0, y: 0});
    const [showToolbar, setShowToolbar] = React.useState(false);
    const [head, setHead] = React.useState(null);
    const [tail, setTail] = React.useState(null);

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

        if (textExpansions?.length) {
            textExpansions.forEach((textExpansion) => {
                textExpansion.unregister?.forEach(key => editor.unregisterTextInputHandler(key));
                textExpansion.register?.forEach(expansion => editor.onTextInput(expansion));
            });
        }

        didCreateEditor?.(editor);
        setEditorInstance(editor);
    }

    React.useEffect(() => {
        if (editorInstance) {
            editorInstance.cursorDidChange(() => {
                if (!editorInstance.range.isCollapsed) {
                    return; 
                }
                let section = editorInstance?.range?.head?.section;
                setShowToolbar(editorInstance.hasCursor());
                if (section?.isBlank) {
                    editorInstance.deleteRange(editorInstance.range);
                    return; 
                }
            });
        }
    }, [editorInstance, head, tail]);

    const handleMouseUpPosition = (event) => {
        setTail(editorInstance.range?.head);
        setCoords({
            x: event.clientX,
            y: event.clientY
        });
    };

    const handleMouseDownPosition = (event) => {
        setHead(editorInstance.range?.tail);
    };

    const positionStyle = {
        zIndex: '22',
        left: coords.x - '100',
        top: coords.y - '45',
        pointerEvents: 'auto'
    };

    return (
        <Container
            data-testid="mobiledoc-container"
            className="md:mx-auto md:py-16 max-w-2xl w-full"
            mobiledoc={mobiledoc}
            atoms={atoms}
            onChange={onChange}
            didCreateEditor={_didCreateEditor}
            placeholder="Begin writing your post...">  
            { showToolbar ? <Toolbar style={positionStyle} className={`toolbar-temporary absolute`} /> : null }
            <Editor
                data-testid="mobiledoc-editor"
                className="prose"
                onMouseUp={handleMouseUpPosition}
                onMouseDown={handleMouseDownPosition}/>
        </Container>
    );
};

export default Koenig;
