import React, {useContext} from 'react';
import AppContext from '../AppContext';
import Avatar from './Avatar';
import {useEditor, EditorContent} from '@tiptap/react';
import {getEditorConfig} from '../utils/editor';

const ReplyForm = (props) => {
    const {postId, dispatchAction} = useContext(AppContext);

    const editor = useEditor({
        ...getEditorConfig({
            placeholder: 'Reply to comment',
            autofocus: true
        })
    });

    const focused = editor?.isFocused || !editor?.isEmpty;

    const submitForm = async (event) => {
        event.preventDefault();

        if (editor.isEmpty) {
            return;
        }

        try {
            // Send comment to server
            await dispatchAction('addReply', {
                parent: props.parent,
                reply: {
                    post_id: postId,
                    status: 'published',
                    html: editor.getHTML()
                }
            });

            // Clear message and blur on success
            editor.chain().clearContent().blur().run();
            props.toggle();
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e);
        }
    };

    const focusEditor = (event) => {
        editor.commands.focus();
    };

    return (
        <form onClick={focusEditor} className={`bg-white dark:bg-[rgba(255,255,255,0.08)] comment-form transition duration-200 rounded-md px-3 pt-3 pb-2 -ml-[13px] -mr-[12px] -mt-[15px] shadow-lg hover:shadow-xl ${focused ? 'cursor-default' : 'cursor-pointer'}`}>
            <div className="w-full relative">
                <div className="pr-3 font-sans leading-normal dark:text-neutral-300">
                    <div className="relative w-full">
                        <EditorContent
                            className={`transition-[height] pl-[56px] pt-0 duration-150 w-full dark:placeholder:text-[rgba(255,255,255,0.3)] placeholder:text-neutral-300 text-[16.5px] border-none resize-none rounded-md border border-slate-50 px-0 py-3 font-sans mb-1 leading-normal focus:outline-0 bg-transparent dark:text-[rgba(255,255,255,0.9)] ${focused ? 'cursor-text h-40' : 'cursor-pointer overflow-hidden h-12 hover:border-slate-300'}`}
                            editor={editor} 
                        />
                        <button
                            className={`transition-[opacity] duration-150 absolute -right-3 bottom-2 rounded-md border py-3 px-4 font-sans text-sm text-center bg-black font-semibold text-white dark:bg-[rgba(255,255,255,0.8)] dark:text-neutral-800`}
                            type="button"
                            onClick={submitForm}
                        >
                            Add reply
                        </button>
                    </div>
                </div>
                <div className="flex mb-1 justify-start items-center absolute top-[2px] left-0">
                    <Avatar saturation={props.avatarSaturation} />
                </div>
            </div>
        </form>
    );
};
  
export default ReplyForm;
