import '../styles/index.css';
import DragDropPastePlugin from '../plugins/DragDropPastePlugin';
import DragDropReorderPlugin from '../plugins/DragDropReorderPlugin';
import FloatingFormatToolbarPlugin from '../plugins/FloatingFormatToolbarPlugin';
import KoenigBehaviourPlugin from '../plugins/KoenigBehaviourPlugin';
import KoenigComposerContext from '../context/KoenigComposerContext';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import MarkdownShortcutPlugin from '../plugins/MarkdownShortcutPlugin';
import React from 'react';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {EditorPlaceholder} from './ui/EditorPlaceholder';
import {ExternalControlPlugin} from '../plugins/ExternalControlPlugin';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {OnChangePlugin} from '@lexical/react/LexicalOnChangePlugin';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';

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
        const json = editorState.toJSON();
        onChange?.(json);
    }, [onChange]);

    const {editorContainerRef, darkMode} = React.useContext(KoenigComposerContext);
    // we need an element reference for the container element that
    // any floating elements in plugins will be rendered inside
    const [floatingAnchorElem, setFloatingAnchorElem] = React.useState(null);
    const onRef = (_floatingAnchorElem) => {
        if (_floatingAnchorElem !== null) {
            setFloatingAnchorElem(_floatingAnchorElem);
        }
    };

    return (
        <div ref={editorContainerRef} className={`koenig-lexical ${darkMode ? 'dark' : ''} ${className}`}>
            <RichTextPlugin
                contentEditable={
                    <div ref={onRef} data-kg="editor">
                        <ContentEditable className="kg-prose" readOnly={readOnly} />
                    </div>
                }
                ErrorBoundary={LexicalErrorBoundary}
                placeholder={placeholder || <EditorPlaceholder />}
            />
            <OnChangePlugin ignoreSelectionChange={true} onChange={_onChange} />
            <HistoryPlugin /> {/* adds undo/redo */}
            <KoenigBehaviourPlugin containerElem={editorContainerRef} cursorDidExitAtTop={cursorDidExitAtTop} />
            <MarkdownShortcutPlugin transformers={markdownTransformers} />
            {floatingAnchorElem && (<FloatingFormatToolbarPlugin anchorElem={floatingAnchorElem} />)}
            {isDragEnabled && <DragDropPastePlugin />}
            <ExternalControlPlugin registerAPI={registerAPI} />
            {isDragEnabled && <DragDropReorderPlugin containerElem={editorContainerRef} />}
            {children}
        </div>
    );
};

export default KoenigComposableEditor;
