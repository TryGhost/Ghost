import React from 'react';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {OnChangePlugin} from '@lexical/react/LexicalOnChangePlugin';
import {ListPlugin} from '@lexical/react/LexicalListPlugin';
import KoenigBehaviourPlugin from '../plugins/KoenigBehaviourPlugin';
import MarkdownShortcutPlugin from '../plugins/MarkdownShortcutPlugin';
import PlusCardMenuPlugin from '../plugins/PlusCardMenuPlugin';
import FloatingFormatToolbarPlugin from '../plugins/FloatingFormatToolbarPlugin';
import '../styles/index.css';

const KoenigEditor = ({
    onChange,
    markdownTransformers
}) => {
    const _onChange = React.useCallback((editorState) => {
        const json = editorState.toJSON();
        onChange?.(json);
    }, [onChange]);

    const containerRef = React.useRef(null);

    // we need an element reference for the container element that
    // any floating elements in plugins will be rendered inside
    const [floatingAnchorElem, setFloatingAnchorElem] = React.useState(null);
    const onRef = (_floatingAnchorElem) => {
        if (_floatingAnchorElem !== null) {
            setFloatingAnchorElem(_floatingAnchorElem);
        }
    };

    return (
        <div className="koenig-lexical" ref={containerRef}>
            <RichTextPlugin
                contentEditable={
                    <div ref={onRef}>
                        <ContentEditable className="kg-prose" />
                    </div>
                }
                placeholder={<div className="pointer-events-none absolute top-0 left-0 min-w-full cursor-text font-serif text-xl text-grey-500">Begin writing your post...</div>}
            />
            <OnChangePlugin onChange={_onChange} />
            <HistoryPlugin /> {/* adds undo/redo */}
            <ListPlugin /> {/* adds indent/outdent/remove etc support */}
            <KoenigBehaviourPlugin containerElem={containerRef} />
            <MarkdownShortcutPlugin transformers={markdownTransformers} />
            <PlusCardMenuPlugin />
            {floatingAnchorElem && (<FloatingFormatToolbarPlugin anchorElem={floatingAnchorElem} />)}
        </div>
    );
};

export default KoenigEditor;
