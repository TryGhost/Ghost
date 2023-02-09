import React from 'react';
import Highlight from 'react-highlight';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {OnChangePlugin} from '@lexical/react/LexicalOnChangePlugin';
import 'highlight.js/styles/atom-one-dark.css';

const SerializedStateTextarea = ({isOpen}) => {
    const [editor] = useLexicalComposerContext();

    const renderEditorState = () => JSON.stringify(editor.getEditorState().toJSON(), null, 2);

    const [serializedJson, setSerializedJson] = React.useState(renderEditorState());

    const onChange = () => {
        setSerializedJson(renderEditorState());
    };

    return (
        <>
            <div className="h-full w-full resize-none !overflow-auto bg-black !p-4 font-mono text-sm text-grey-300 selection:bg-grey-800">
                {isOpen && (
                    <Highlight className="json">
                        {serializedJson}
                    </Highlight>
                )}
            </div>
            <OnChangePlugin onChange={onChange} />
        </>
    );
};

export default SerializedStateTextarea;
