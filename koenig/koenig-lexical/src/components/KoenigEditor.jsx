import React from 'react';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {OnChangePlugin} from '@lexical/react/LexicalOnChangePlugin';
import {ListPlugin} from '@lexical/react/LexicalListPlugin';
import MarkdownShortcutPlugin from '../plugins/MarkdownShortcutPlugin';
import FloatingFormatToolbarPlugin from '../plugins/FloatingFormatToolbar';
import '../styles/index.css';

const KoenigEditor = ({
    onChange,
    markdownTransformers
}) => {
    const _onChange = React.useCallback((editorState) => {
        const json = editorState.toJSON();
        onChange?.(json);
    }, [onChange]);

    // we need an element reference for the container element that
    // any floating elements in plugins will be rendered inside
    const [floatingAnchorElem, setFloatingAnchorElem] = React.useState(null);
    const onRef = (_floatingAnchorElem) => {
        if (_floatingAnchorElem !== null) {
            setFloatingAnchorElem(_floatingAnchorElem);
        }
    };

    return (
        <div className="koenig-lexical">
            <RichTextPlugin
                contentEditable={
                    <div ref={onRef}>
                        <ContentEditable className="kg-prose" />
                    </div>
                }
                placeholder={<div className="text-grey-500 pointer-events-none absolute top-0 left-0 min-w-full cursor-text font-serif text-xl">Begin writing your post...</div>}
            />
            <OnChangePlugin onChange={_onChange} />
            <HistoryPlugin /> {/* adds undo/redo */}
            <ListPlugin /> {/* adds indent/outdent/remove etc support */}
            <MarkdownShortcutPlugin transformers={markdownTransformers} />
            {floatingAnchorElem && (<FloatingFormatToolbarPlugin anchorElem={floatingAnchorElem} />)}
        </div>
    );
};

export default KoenigEditor;
