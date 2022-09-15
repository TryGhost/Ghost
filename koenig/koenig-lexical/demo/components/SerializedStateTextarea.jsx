import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {OnChangePlugin} from '@lexical/react/LexicalOnChangePlugin';
import React from 'react';

const SerializedStateTextarea = () => {
    const [editor] = useLexicalComposerContext();
    const [serializedJson, setSerializedJson] = React.useState('{}');

    const onChange = () => {
        setSerializedJson(JSON.stringify(editor.getEditorState().toJSON()));
    };

    return (
        <>
            <textarea value={serializedJson} readOnly className="h-50 text-md w-full" />
            <OnChangePlugin onChange={onChange} />
        </>
    );
};

export default SerializedStateTextarea;
