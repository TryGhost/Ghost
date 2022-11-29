import React from 'react';
import {$getRoot} from 'lexical';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

const ToggleButton = ({content, setTitle}) => {
    const [editor] = useLexicalComposerContext();
    const [isOn, setIsOn] = React.useState(true);

    const toggle = () => {
        if (!isOn) {
            const editorState = editor.parseEditorState(content);
            editor.setEditorState(editorState);
            setTitle('Meet the Koenig editor.');
        }
        if (isOn) {
            editor.update(() => {
                $getRoot().clear();
            });
            setTitle('');
        }
        setIsOn(!isOn);
    };

    return (
        <button type="button" className="cursor-pointer" onClick={toggle}>
            {isOn ? 'Toggle Off' : 'Toggle on'}
        </button>
    );
};

export default ToggleButton;
