import * as React from 'react';
import {Container, Editor} from 'react-mobiledoc-editor';
import KoenigEditor from '../KoenigEditor';
import DEFAULT_ATOMS from '../atoms';
import DEFAULT_CARDS from '../cards';
import DEFAULT_KEY_COMMANDS from '../key-commands';
import DEFAULT_TEXT_EXPANSIONS from '../text-expansions';
import Toolbar from './toolbar';

// "hack" to work around function components not having any constructor-like behavior
const useConstructor = (callback = function () {}) => {
    const hasBeenCalled = React.useRef(false);
    if (hasBeenCalled.current) {
        return;
    }
    callback();
    hasBeenCalled.current = true;
};

const Koenig = ({
    mobiledoc,
    atoms = DEFAULT_ATOMS,
    cards = DEFAULT_CARDS,
    cardProps = {},
    keyCommands = DEFAULT_KEY_COMMANDS,
    textExpansions = DEFAULT_TEXT_EXPANSIONS,
    didCreateEditor,
    onChange,
    onCursorExitAtTop
}) => {
    const [, setSelectedRange] = React.useState(null);
    const [, setActiveMarkupTags] = React.useState({});
    const [, setActiveSectionTags] = React.useState({});

    // Create an instance of KoenigEditor on first render and store a reference.
    // - We need an instance of KoenigEditor immediately because it generates
    //   a `cardProps` object with additional hooks for rendering cards and we
    //   need that to pass into the very first render of `<Container>`
    const koenigEditorRef = React.useRef();
    useConstructor(() => {
        const kgInstance = new KoenigEditor({
            atoms,
            cardProps,
            cards,
            keyCommands,
            textExpansions,
            onSelectedRangeChange: setSelectedRange,
            onActiveMarkupTagsChange: setActiveMarkupTags,
            onActiveSectionTagsChange: setActiveSectionTags,
            onCursorExitAtTop
        });

        koenigEditorRef.current = kgInstance;
    });
    // purely for convenience
    const koenigEditor = koenigEditorRef.current;
    const [mobiledocInstance, setMobiledocInstance] = React.useState(null);

    function _didCreateEditor(mobiledocEditor) {
        // TODO: keep mobiledoc instance separate or always use koenigEditor.mobiledocEditor
        // to avoid passing around two editor instances everywhere?
        setMobiledocInstance(mobiledocEditor);

        koenigEditor.initMobiledocEditor(mobiledocEditor);

        didCreateEditor?.(mobiledocEditor, koenigEditor);
    }

    return (
        <Container
            className='relative'
            id="mobiledoc-editor"
            data-testid="mobiledoc-container"
            mobiledoc={mobiledoc}
            onChange={onChange}
            didCreateEditor={_didCreateEditor}
            placeholder="Begin writing your post..."
            {...koenigEditor.editorProps}
        >
            <Editor
                data-testid="mobiledoc-editor">
            </Editor>
            <Toolbar editor={mobiledocInstance} />
        </Container>
    );
};

export default Koenig;
