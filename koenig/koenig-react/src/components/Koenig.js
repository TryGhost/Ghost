import * as React from 'react';
import {Container, Toolbar, Editor} from 'react-mobiledoc-editor';
import KoenigEditor from '../KoenigEditor';
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
    const [, setKoenigInstance] = React.useState(null);
    const [mobiledocInstance, setMobiledocInstance] = React.useState(null);
    const [coords, setCoords] = React.useState({x: 0, y: 0});
    const [showToolbar, setShowToolbar] = React.useState(false);
    const [head, setHead] = React.useState(null);
    const [tail, setTail] = React.useState(null);

    function _didCreateEditor(mobiledocEditor) {
        const koenig = new KoenigEditor(mobiledocEditor, {atoms, keyCommands, textExpansions});

        setMobiledocInstance(mobiledocEditor);
        setKoenigInstance(koenig);

        didCreateEditor?.(mobiledocEditor, koenig);
    }

    React.useEffect(() => {
        if (mobiledocInstance) {
            mobiledocInstance.cursorDidChange(() => {
                if (!mobiledocInstance.range.isCollapsed) {
                    return;
                }
                let section = mobiledocInstance?.range?.head?.section;
                setShowToolbar(mobiledocInstance.hasCursor());
                if (section?.isBlank) {
                    mobiledocInstance.deleteRange(mobiledocInstance.range);
                    return;
                }
            });
        }
    }, [mobiledocInstance, head, tail]);

    const handleMouseUpPosition = (event) => {
        setTail(mobiledocInstance.range?.head);
        setCoords({
            x: event.clientX,
            y: event.clientY
        });
    };

    const handleMouseDownPosition = (event) => {
        setHead(mobiledocInstance.range?.tail);
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
            className="w-full max-w-2xl md:mx-auto md:py-16"
            mobiledoc={mobiledoc}
            atoms={atoms}
            onChange={onChange}
            didCreateEditor={_didCreateEditor}
            placeholder="Begin writing your post..."
        >
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
