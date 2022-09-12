import React from 'react';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {OnChangePlugin} from '@lexical/react/LexicalOnChangePlugin';
import {ListPlugin} from '@lexical/react/LexicalListPlugin';
import '../styles/index.css';

const KoenigEditor = ({
    onChange
}) => {
    const _onChange = React.useCallback((editorState) => {
        const json = editorState.toJSON();
        onChange?.(json);
    }, [onChange]);

    return (
        <div className="koenig-lexical">
            <RichTextPlugin
                contentEditable={
                    <div>
                        <ContentEditable className="kg-prose" />
                    </div>
                }
                placeholder={<div className="pointer-events-none absolute top-0 left-0 min-w-full cursor-text">Enter some text...</div>}
            />
            <OnChangePlugin onChange={_onChange} />
            <HistoryPlugin /> {/* adds undo/redo */}
            <ListPlugin /> {/* adds indent/outdent/remove etc support */}
        </div>
    );
};

export default KoenigEditor;
