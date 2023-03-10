import React from 'react';
import {$createParagraphNode, $getRoot} from 'lexical';
import {ReactComponent as EyeClosedIcon} from './icons/eye-closed.svg';
import {ReactComponent as EyeOpenIcon} from './icons/eye-open.svg';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

const InitialContentToggle = ({defaultContent, setTitle, searchParams, setSearchParams}) => {
    const [editor] = useLexicalComposerContext();
    const [isOn, setIsOn] = React.useState(searchParams.get('content') !== 'false');

    const toggle = () => {
        if (!isOn) {
            const editorState = editor.parseEditorState(defaultContent);
            editor.setEditorState(editorState);
            setTitle('Meet the Koenig editor.');
            setSearchParams({});
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
            setSearchParams({content: 'false'});
        }
        setIsOn(!isOn);
    };

    return (
        <>
            <button type="button" onClick={toggle} className="absolute top-4 right-6 z-20 block h-[22px] w-[42px] cursor-pointer rounded-full bg-black transition-all ease-in-out">
                <EyeOpenIcon className="absolute top-[5px] left-[6px] h-3 w-3 text-white" />
                <EyeClosedIcon className="absolute top-[5px] right-[6px] h-3 w-3 text-white" />
                <div className={`absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white transition-all ease-in-out ${isOn ? 'left-[22px]' : 'left-[2px]'}`}></div>
            </button>
        </>
    );
};

export default InitialContentToggle;
