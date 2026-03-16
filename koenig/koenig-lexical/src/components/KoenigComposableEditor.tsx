import '../styles/index.css';
import DragDropPastePlugin from '../plugins/DragDropPastePlugin';
import DragDropReorderPlugin from '../plugins/DragDropReorderPlugin';
import FloatingToolbarPlugin from '../plugins/FloatingToolbarPlugin';
import KoenigBehaviourPlugin from '../plugins/KoenigBehaviourPlugin';
import KoenigComposerContext from '../context/KoenigComposerContext';
import KoenigErrorBoundary from './KoenigErrorBoundary';
import MarkdownPastePlugin from '../plugins/MarkdownPastePlugin';
import MarkdownShortcutPlugin from '../plugins/MarkdownShortcutPlugin';
import React from 'react';
import TKPlugin from '../plugins/TKPlugin';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {EditorPlaceholder} from './ui/EditorPlaceholder';
import {ExternalControlPlugin} from '../plugins/ExternalControlPlugin';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {KoenigBlurPlugin} from '../plugins/KoenigBlurPlugin';
import {KoenigFocusPlugin} from '../plugins/KoenigFocusPlugin';
import {LinkPlugin} from '@lexical/react/LexicalLinkPlugin';
import {OnChangePlugin} from '@lexical/react/LexicalOnChangePlugin';
import {RestrictContentPlugin} from '../index';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {useCollaborationContext} from '@lexical/react/LexicalCollaborationContext';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useSharedHistoryContext} from '../context/SharedHistoryContext';
import {useSharedOnChangeContext} from '../context/SharedOnChangeContext';
import type {EditorState} from 'lexical';
import type {Transformer} from '@lexical/markdown';

export interface KoenigComposableEditorProps {
    onChange?: (json: unknown) => void;
    onBlur?: () => void;
    onFocus?: () => void;
    markdownTransformers?: Transformer[];
    registerAPI?: (api: unknown) => void;
    cursorDidExitAtTop?: () => void;
    children?: React.ReactNode;
    placeholder?: React.ReactNode;
    singleParagraph?: boolean;
    placeholderText?: string;
    placeholderClassName?: string;
    className?: string;
    readOnly?: boolean;
    isDragEnabled?: boolean;
    inheritStyles?: boolean;
    isSnippetsEnabled?: boolean;
    hiddenFormats?: string[];
    useDefaultClasses?: boolean;
    dataTestId?: string;
}

const KoenigComposableEditor = ({
    onChange,
    onBlur,
    onFocus,
    markdownTransformers,
    registerAPI,
    cursorDidExitAtTop,
    children,
    placeholder,
    singleParagraph,
    placeholderText,
    placeholderClassName = '',
    className = '',
    readOnly = false,
    isDragEnabled = true,
    inheritStyles = false,
    isSnippetsEnabled = true,
    hiddenFormats = [],
    useDefaultClasses = true,
    dataTestId
}: KoenigComposableEditorProps) => {
    const {historyState} = useSharedHistoryContext();
    const [editor] = useLexicalComposerContext();
    const {isCollabActive} = useCollaborationContext();
    const {editorContainerRef, darkMode, isTKEnabled} = React.useContext(KoenigComposerContext);

    const isNested = !!editor._parentEditor;
    const isDragReorderEnabled = isDragEnabled && !readOnly && !isNested;

    const {onChange: sharedOnChange} = useSharedOnChangeContext();
    const _onChange = React.useCallback((editorState: EditorState) => {
        if (sharedOnChange) {
            // sharedOnChange is called for the main editor and nested editors, we want to
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

    const onWrapperRef = (wrapperElem: HTMLDivElement | null) => {
        if (!isNested) {
            (editorContainerRef as React.MutableRefObject<HTMLElement | null>).current = wrapperElem;
        }
    };

    // we need an element reference for the container element that
    // any floating elements in plugins will be rendered inside
    const [floatingAnchorElem, setFloatingAnchorElem] = React.useState<HTMLDivElement | null>(null);
    const onContentEditableRef = (_floatingAnchorElem: HTMLDivElement | null) => {
        if (_floatingAnchorElem !== null) {
            setFloatingAnchorElem(_floatingAnchorElem);
        }
    };

    return (
        <div
            ref={onWrapperRef}
            className={`${useDefaultClasses ? 'koenig-lexical' : ''} ${inheritStyles ? 'kg-inherit-styles' : ''} ${darkMode ? 'dark' : ''} ${className}`}
            data-koenig-dnd-disabled={!isDragEnabled}
            data-testid={dataTestId}
        >
            <RichTextPlugin
                contentEditable={
                    <div ref={onContentEditableRef} data-kg="editor">
                        <ContentEditable className={useDefaultClasses ? 'kg-prose' : ''} readOnly={readOnly} />
                    </div>
                }
                ErrorBoundary={KoenigErrorBoundary}
                placeholder={placeholder as React.JSX.Element || <EditorPlaceholder className={placeholderClassName} text={placeholderText} />}
            />
            <LinkPlugin />
            <OnChangePlugin ignoreHistoryMergeTagChange={false} ignoreSelectionChange={true} onChange={_onChange} />
            {!isCollabActive && <HistoryPlugin externalHistoryState={historyState} />} {/* adds undo/redo, in multiplayer that's handled by yjs */}
            <KoenigBehaviourPlugin containerElem={editorContainerRef} cursorDidExitAtTop={cursorDidExitAtTop} isNested={isNested} />
            <MarkdownShortcutPlugin transformers={markdownTransformers} />
            {floatingAnchorElem && (<FloatingToolbarPlugin anchorElem={floatingAnchorElem} hiddenFormats={hiddenFormats} isSnippetsEnabled={isSnippetsEnabled} />)}
            <DragDropPastePlugin />
            {registerAPI ? <ExternalControlPlugin registerAPI={registerAPI} /> : null}
            {isDragReorderEnabled && <DragDropReorderPlugin />}
            {singleParagraph && <RestrictContentPlugin allowBr={false} paragraphs={1} />}
            {onBlur && <KoenigBlurPlugin onBlur={onBlur} />}
            {onFocus && <KoenigFocusPlugin onFocus={onFocus} />}
            <MarkdownPastePlugin />
            {isTKEnabled && <TKPlugin />}
            {children}
        </div>
    );
};

export default KoenigComposableEditor;
