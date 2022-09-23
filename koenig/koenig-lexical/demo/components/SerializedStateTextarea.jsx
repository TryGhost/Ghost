import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {OnChangePlugin} from '@lexical/react/LexicalOnChangePlugin';
import React from 'react';

const SerializedStateTextarea = (props) => {
    const [editor] = useLexicalComposerContext();
    const [serializedJson, setSerializedJson] = React.useState('{}');
    const sidebarState = props.toggle;

    const onChange = () => {
        setSerializedJson(JSON.stringify(editor.getEditorState().toJSON()));
    };

    return (
        <div className={`border-grey-100 absolute h-full w-full grow overflow-hidden rounded-md pb-14 shadow-[0_0_1px_rgba(0,0,0,.12),0_5px_18px_rgba(0,0,0,.05)] transition-all duration-100 ease-in ${sidebarState ? 'visible right-0 opacity-100' : 'invisible right-[-30%] opacity-0'}`}>
            <textarea value={serializedJson} readOnly className="text-grey-800 h-full w-full resize-none p-5 font-mono text-sm" />
            <OnChangePlugin onChange={onChange} />
        </div>
    );
};

export default SerializedStateTextarea;
