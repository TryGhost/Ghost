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
import {OnChangePlugin} from '@lexical/react/LexicalOnChangePlugin';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useSharedHistoryContext} from '../context/SharedHistoryContext';

const KoenigComposableEditor = ({
    onChange,
    markdownTransformers,
    registerAPI,
    cursorDidExitAtTop,
    children,
    placeholder,
    className = '',
    readOnly = false,
    isDragEnabled = true
}) => {
    const _onChange = React.useCallback((editorState) => {
        if (onChange) {
            const json = editorState.toJSON();
            onChange(json);
        }
    }, [onChange]);

    const {historyState} = useSharedHistoryContext();

    const [editor] = useLexicalComposerContext();
    const {editorContainerRef, darkMode} = React.useContext(KoenigComposerContext);

    const isNested = !!editor._parentEditor;
    const isDragReorderEnabled = isDragEnabled && !readOnly && !isNested;

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
                placeholder={placeholder || <EditorPlaceholder />}
            />
            <OnChangePlugin ignoreSelectionChange={true} onChange={_onChange} />
            <HistoryPlugin externalHistoryState={historyState} /> {/* adds undo/redo */}
            <KoenigBehaviourPlugin containerElem={editorContainerRef} cursorDidExitAtTop={cursorDidExitAtTop} isNested={isNested} />
            <MarkdownShortcutPlugin transformers={markdownTransformers} />
            {floatingAnchorElem && (<FloatingFormatToolbarPlugin anchorElem={floatingAnchorElem} />)}
            <DragDropPastePlugin />
            {registerAPI ? <ExternalControlPlugin registerAPI={registerAPI} /> : null}
            {isDragReorderEnabled && <DragDropReorderPlugin containerElem={editorContainerRef} />}
            {children}
        </div>
    );
};

export default KoenigComposableEditor;
