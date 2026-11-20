import CardContext from '../context/CardContext';
import KoenigNestedEditorPlugin from '../plugins/KoenigNestedEditorPlugin.jsx';
import React from 'react';
import {BASIC_NODES, BASIC_TRANSFORMERS, KoenigComposableEditor, KoenigNestedComposer, MINIMAL_NODES, MINIMAL_TRANSFORMERS, RestrictContentPlugin} from '../index.js';
import {EmojiPickerPlugin} from '../plugins/EmojiPickerPlugin.jsx';
import {useIsDocumentEditable} from '../hooks/useIsDocumentEditable';

const Placeholder = ({text = 'Type here', className = ''}) => {
    // Note: we use line-clamp-1, instead of truncate because truncate adds 'white-space: nowrap', which often breaks overflows of parents in some cards
    return (
        <div className={`placeholder not-kg-prose pointer-events-none h-0 cursor-text overflow-visible`}>
            <div className={`line-clamp-1 translate-y-[-100%] xs:overflow-visible ${className}`}>{text}</div>
        </div>
    );
};

const KoenigNestedEditor = ({
    initialEditor,
    initialEditorState,
    initialTheme,
    nodes = 'basic',
    placeholderText = '',
    textClassName = '',
    placeholderClassName = '',
    autoFocus = false,
    focusNext = null,
    singleParagraph = false,
    hasSettingsPanel = false,
    defaultKoenigEnterBehaviour = false,
    hiddenFormats = [],
    useDefaultClasses = true,
    dataTestId,
    children
}) => {
    const initialNodes = nodes === 'minimal' ? MINIMAL_NODES : BASIC_NODES;
    const markdownTransformers = nodes === 'minimal' ? MINIMAL_TRANSFORMERS : BASIC_TRANSFORMERS;

    // Lexical copies the top-level editor's editable flag to every nested editor
    // when it changes, which would leave a card that is not being edited typable
    // once a read-only editor is editable again
    const {isEditing} = React.useContext(CardContext);
    const isEditable = useIsDocumentEditable();
    const wasEditable = React.useRef(isEditable);
    React.useEffect(() => {
        if (isEditable && !wasEditable.current && !isEditing) {
            initialEditor.setEditable(false);
        }
        wasEditable.current = isEditable;
    }, [initialEditor, isEditable, isEditing]);

    return (
        <KoenigNestedComposer
            initialEditor={initialEditor}
            initialEditorState={initialEditorState}
            initialNodes={initialNodes}
            initialTheme={initialTheme}
        >
            <KoenigComposableEditor
                className={textClassName}
                dataTestId={dataTestId}
                hiddenFormats={hiddenFormats}
                inheritStyles={true}
                isDragEnabled={false}
                markdownTransformers={markdownTransformers}
                placeholder={<Placeholder className={placeholderClassName} text={placeholderText} />}
                useDefaultClasses={useDefaultClasses}
            >
                {singleParagraph && <RestrictContentPlugin paragraphs={1} />}

                {children}

                <KoenigNestedEditorPlugin
                    autoFocus={autoFocus}
                    defaultKoenigEnterBehaviour={defaultKoenigEnterBehaviour}
                    focusNext={focusNext}
                    hasSettingsPanel={hasSettingsPanel}
                />

                <EmojiPickerPlugin />

            </KoenigComposableEditor>
        </KoenigNestedComposer>
    );
};

export default KoenigNestedEditor;
