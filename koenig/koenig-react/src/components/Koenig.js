import React from 'react';
import {Container, Editor} from 'react-mobiledoc-editor';
import KoenigEditor from '../KoenigEditor';
import koenigEditorContext from '../contexts/koenig-editor-context';
import DEFAULT_ATOMS from '../atoms';
import DEFAULT_CARDS from '../cards';
import DEFAULT_KEY_COMMANDS from '../key-commands';
import DEFAULT_TEXT_EXPANSIONS from '../text-expansions';
import Toolbar from './toolbar/Toolbar';
import PlusMenu from './PlusMenu';
import SlashMenu from './SlashMenu';

// "hack" to work around function components not having any constructor-like behavior

const Koenig = ({
    mobiledoc,
    atoms = DEFAULT_ATOMS,
    cards = DEFAULT_CARDS,
    cardProps = {},
    keyCommands = DEFAULT_KEY_COMMANDS,
    textExpansions = DEFAULT_TEXT_EXPANSIONS,
    didCreateEditor,
    onChange,
    onCursorExitAtTop,
    uploadUrl,
    accentColor
}) => {
    const [selectedRange, setSelectedRange] = React.useState(null);
    const [activeMarkupTags, setActiveMarkupTags] = React.useState({});
    const [activeSectionTags, setActiveSectionTags] = React.useState({});

    // We need an instance of KoenigEditor immediately because it generates
    // a `cardProps` object with additional hooks for rendering cards and we
    // need that to pass into the very first render of `<Container>`.
    // koenigEditorContext value is set to this KoenigEditor instance
    const [koenigEditor] = React.useState(() => {
        return new KoenigEditor({
            atoms,
            cardProps,
            cards,
            keyCommands,
            textExpansions,
            onSelectedRangeChange: setSelectedRange,
            onActiveMarkupTagsChange: setActiveMarkupTags,
            onActiveSectionTagsChange: setActiveSectionTags,
            onCursorExitAtTop,
            uploadUrl
        });
    });

    // Initial default accent colour.
    const [accentColorState, setAccentColorState] = React.useState('#ff0095');

    function _didCreateEditor(mobiledocEditor) {
        koenigEditor.initMobiledocEditor(mobiledocEditor);
        didCreateEditor?.(mobiledocEditor, koenigEditor);
    }

    React.useEffect(() => {
        if (accentColor) {
            setAccentColorState(`#${accentColor}`);
        }
    }, [accentColor]);

    const AccentStyles = ({color}) => {
        return (
            <style>
                {`
                :root{
                    --kg-accent-color: ${color};
                }
                `}
            </style>
        );
    };

    return (
        <koenigEditorContext.Provider value={koenigEditor}>
            <Container
                className="relative"
                id="mobiledoc-editor"
                data-testid="mobiledoc-container"
                mobiledoc={mobiledoc}
                onChange={onChange}
                didCreateEditor={_didCreateEditor}
                placeholder="Begin writing your post..."
                {...koenigEditor.editorProps}
            >
                <Editor
                    className="kg-prose"
                    data-testid="mobiledoc-editor">
                </Editor>

                {/* pop-up markup toolbar shown when there's a selection and mouse movement */}
                <Toolbar
                    activeMarkupTags={activeMarkupTags}
                    activeSectionTags={activeSectionTags}
                    selectedRange={selectedRange}
                />

                {/* (+) icon and pop-up card menu */}
                <PlusMenu
                    selectedRange={selectedRange}
                />

                {/* slash menu popup */}
                <SlashMenu
                    selectedRange={selectedRange}
                />
                <AccentStyles color={accentColorState}/>

            </Container>
        </koenigEditorContext.Provider>
    );
};

export default Koenig;
