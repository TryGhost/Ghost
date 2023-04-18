import '../styles/index.css';
import DragDropPastePlugin from '../plugins/DragDropPastePlugin';
import DragDropReorderPlugin from '../plugins/DragDropReorderPlugin';
import FloatingFormatToolbarPlugin from '../plugins/FloatingFormatToolbarPlugin';
import KoenigBehaviourPlugin from '../plugins/KoenigBehaviourPlugin';
import KoenigComposerContext from '../context/KoenigComposerContext';
import KoenigErrorBoundary from './KoenigErrorBoundary';
import MarkdownShortcutPlugin from '../plugins/MarkdownShortcutPlugin';
import React from 'react';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {EditorPlaceholder} from './ui/EditorPlaceholder';
import {ExternalControlPlugin} from '../plugins/ExternalControlPlugin';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {LinkPlugin} from '@lexical/react/LexicalLinkPlugin';
import {OnChangePlugin} from '@lexical/react/LexicalOnChangePlugin';
import {RestrictContentPlugin} from '../index.js';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {useCollaborationContext} from '@lexical/react/LexicalCollaborationContext';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useSharedHistoryContext} from '../context/SharedHistoryContext';
import {useSharedOnChangeContext} from '../context/SharedOnChangeContext';

const KoenigComposableEditor = ({
    onChange,
    markdownTransformers,
    registerAPI,
    cursorDidExitAtTop,
    children,
    placeholder,
    singleParagraph,
    placeholderText = '',
    placeholderClassName = '',
    className = '',
    readOnly = false,
    isDragEnabled = true,
    isSnippetsEnabled = true
}) => {
    const {historyState} = useSharedHistoryContext();
    const [editor] = useLexicalComposerContext();
    const {isCollabActive} = useCollaborationContext();
    const {editorContainerRef, darkMode} = React.useContext(KoenigComposerContext);

    const isNested = !!editor._parentEditor;
    const isDragReorderEnabled = isDragEnabled && !readOnly && !isNested;

    const {onChange: sharedOnChange} = useSharedOnChangeContext();
    const _onChange = React.useCallback((editorState) => {
        if (sharedOnChange) {
            // sharedInChange is called for the main editor and nested editors, we want to
            // make sure we don't accidentally serialize only the contents of the nested
            // editor so we need to use the parent editor when it exists
            const primaryEditorState = (editor._parentEditor || editor).getEditorState();
            const json = primaryEditorState.toJSON();
            sharedOnChange(json);
        }

        if (onChange) {
            // onChange is only called for this current editor instance, allowing for
            // per-editor onChange handlers
            const json = editorState.toJSON();
            onChange(json);
        }
    }, [onChange, sharedOnChange, editor]);

    const onWrapperRef = (wrapperElem) => {
        if (!isNested) {
            editorContainerRef.current = wrapperElem;
        }
    };

    // we need an element reference for the container element that
    // any floating elements in plugins will be rendered inside
    const [floatingAnchorElem, setFloatingAnchorElem] = React.useState(null);
    const onContentEditableRef = (_floatingAnchorElem) => {
        if (_floatingAnchorElem !== null) {
            setFloatingAnchorElem(_floatingAnchorElem);
        }
    };

    return (
        <div ref={onWrapperRef} className={`koenig-lexical ${darkMode ? 'dark' : ''} ${className}`}>
            <RichTextPlugin
                contentEditable={
                    <div ref={onContentEditableRef} data-kg="editor">
                        <ContentEditable className="kg-prose" readOnly={readOnly} />
                    </div>
                }
                ErrorBoundary={KoenigErrorBoundary}
                placeholder={placeholder || <EditorPlaceholder className={placeholderClassName} text={placeholderText} />}
            />
            <LinkPlugin />
            <OnChangePlugin ignoreSelectionChange={true} onChange={_onChange} />
            {!isCollabActive && <HistoryPlugin externalHistoryState={historyState} />} {/* adds undo/redo, in multiplayer that's handled by yjs */}
            <KoenigBehaviourPlugin containerElem={editorContainerRef} cursorDidExitAtTop={cursorDidExitAtTop} isNested={isNested} />
            <MarkdownShortcutPlugin transformers={markdownTransformers} />
            {floatingAnchorElem && (<FloatingFormatToolbarPlugin anchorElem={floatingAnchorElem} isSnippetsEnabled={isSnippetsEnabled} />)}
            <DragDropPastePlugin />
            {registerAPI ? <ExternalControlPlugin registerAPI={registerAPI} /> : null}
            {isDragReorderEnabled && <DragDropReorderPlugin containerElem={editorContainerRef} />}
            {singleParagraph && <RestrictContentPlugin paragraphs={1} />}
            {children}
        </div>
    );
};

export default KoenigComposableEditor;
