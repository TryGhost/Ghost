import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {OnChangePlugin} from '@lexical/react/LexicalOnChangePlugin';
import React from 'react';
import CodeEditor from '@uiw/react-textarea-code-editor';

const SerializedStateTextarea = () => {
    const [editor] = useLexicalComposerContext();

    const renderEditorState = () => JSON.stringify(editor.getEditorState().toJSON(), null, 2);

    const [serializedJson, setSerializedJson] = React.useState(renderEditorState());

    const onChange = () => {
        setSerializedJson(renderEditorState());
    };

    return (
        <>
            <CodeEditor
                value={serializedJson}
                language="JSON"
                className="h-full w-full resize-none !overflow-auto bg-black !p-4 font-mono text-sm selection:bg-grey-800"
                readOnly
            />
            <OnChangePlugin onChange={onChange} />
        </>
    );
};

export default SerializedStateTextarea;
