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
            <textarea value={serializedJson} readOnly className="h-50 text-md border-grey-200 absolute top-0 right-5 w-full max-w-sm rounded-md border p-5 shadow-sm" />
            <OnChangePlugin onChange={onChange} />
        </>
    );
};

export default SerializedStateTextarea;
