import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {OnChangePlugin} from '@lexical/react/LexicalOnChangePlugin';
import React from 'react';
import CodeEditor from '@uiw/react-textarea-code-editor';

const SerializedStateTextarea = (props) => {
    const [editor] = useLexicalComposerContext();
    const [serializedJson, setSerializedJson] = React.useState('{}');
    const sidebarState = props.toggle;

    const onChange = () => {
        setSerializedJson(JSON.stringify(editor.getEditorState().toJSON(), null, 2));
    };

    return (
        <div className={`h-full grow overflow-hidden border-grey-100 bg-black pb-14 transition-all ease-in-out ${sidebarState ? 'right-0 w-[440px] opacity-100' : 'right-[-100%] w-0 opacity-0'}`}>
            <CodeEditor
                value={serializedJson}
                language="JSON"
                className="h-full w-full resize-none !overflow-auto bg-black !p-4 font-mono text-sm"
                readOnly
            />
            <OnChangePlugin onChange={onChange} />
        </div>
    );
};

export default SerializedStateTextarea;
