import React from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {ReactComponent as EyeOpenIcon} from './icons/eye-open.svg';
import {ReactComponent as EyeClosedIcon} from './icons/eye-closed.svg';
import {$createParagraphNode, $getRoot} from 'lexical';

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
                const root = $getRoot();
                const paragraph = $createParagraphNode();
                root.clear();
                root.append(paragraph);
                paragraph.select();
            });
            setTitle('');
        }
        setIsOn(!isOn);
    };

    return (
        <>
            <button type="button" onClick={toggle} className="absolute top-4 right-6 rounded-full transition-all ease-in-out h-[22px] w-[42px] bg-black cursor-pointer block">
                <EyeOpenIcon className="absolute top-[5px] left-[6px] w-3 h-3 text-white" />
                <EyeClosedIcon className="absolute top-[5px] right-[6px] w-3 h-3 text-white" />
                <div className={`h-[18px] absolute top-[2px] w-[18px] bg-white rounded-full transition-all ease-in-out ${isOn ? 'left-[22px]' : 'left-[2px]'}`}></div>
            </button>
        </>
    );
};

export default ToggleButton;
