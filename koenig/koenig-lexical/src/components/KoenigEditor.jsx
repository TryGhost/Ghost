import React from 'react';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {OnChangePlugin} from '@lexical/react/LexicalOnChangePlugin';
import {ListPlugin} from '@lexical/react/LexicalListPlugin';
import {TabIndentationPlugin} from '@lexical/react/LexicalTabIndentationPlugin';
import KoenigComposerContext from '../context/KoenigComposerContext';
import KoenigBehaviourPlugin from '../plugins/KoenigBehaviourPlugin';
import MarkdownShortcutPlugin from '../plugins/MarkdownShortcutPlugin';
import PlusCardMenuPlugin from '../plugins/PlusCardMenuPlugin';
import SlashCardMenuPlugin from '../plugins/SlashCardMenuPlugin';
import FloatingFormatToolbarPlugin from '../plugins/FloatingFormatToolbarPlugin';
import ImagePlugin from '../plugins/ImagePlugin';
import DragDropPastePlugin from '../plugins/DragDropPastePlugin';
import HorizontalRulePlugin from '../plugins/HorizontalRulePlugin';
import {EditorPlaceholder} from './ui/EditorPlaceholder';
import {ExternalControlPlugin} from '../plugins/ExternalControlPlugin';
import '../styles/index.css';

const KoenigEditor = ({
    onChange,
    markdownTransformers,
    registerAPI,
    cursorDidExitAtTop
}) => {
    const _onChange = React.useCallback((editorState) => {
        const json = editorState.toJSON();
        onChange?.(json);
    }, [onChange]);

    const {editorContainerRef} = React.useContext(KoenigComposerContext);
    // we need an element reference for the container element that
    // any floating elements in plugins will be rendered inside
    const [floatingAnchorElem, setFloatingAnchorElem] = React.useState(null);
    const onRef = (_floatingAnchorElem) => {
        if (_floatingAnchorElem !== null) {
            setFloatingAnchorElem(_floatingAnchorElem);
        }
    };

    return (
        <div className="koenig-lexical" ref={editorContainerRef}>
            <RichTextPlugin
                contentEditable={
                    <div ref={onRef}>
                        <ContentEditable className="kg-prose" />
                    </div>
                }
                placeholder={<EditorPlaceholder />}
                ErrorBoundary={LexicalErrorBoundary}
            />
            <OnChangePlugin onChange={_onChange} />
            <HistoryPlugin /> {/* adds undo/redo */}
            <ListPlugin /> {/* adds indent/outdent/remove etc support */}
            <TabIndentationPlugin /> {/* tab/shift+tab triggers indent/outdent */}
            <KoenigBehaviourPlugin containerElem={editorContainerRef} cursorDidExitAtTop={cursorDidExitAtTop} />
            <MarkdownShortcutPlugin transformers={markdownTransformers} />
            <PlusCardMenuPlugin />
            <SlashCardMenuPlugin />
            {floatingAnchorElem && (<FloatingFormatToolbarPlugin anchorElem={floatingAnchorElem} />)}
            <ImagePlugin />
            <DragDropPastePlugin />
            <HorizontalRulePlugin />
            <ExternalControlPlugin registerAPI={registerAPI} />
        </div>
    );
};

export default KoenigEditor;
