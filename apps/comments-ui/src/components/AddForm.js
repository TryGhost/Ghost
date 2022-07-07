import React, {useContext, useState, useEffect} from 'react';
import {Transition} from '@headlessui/react';
import AppContext from '../AppContext';
import Avatar from './Avatar';
import {useEditor, EditorContent} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

const AddForm = (props) => {
    const {member, postId, onAction} = useContext(AppContext);
    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: 'Join the discussion'
            })
        ],
        content: '',
        autofocus: true,
        editorProps: {
            attributes: {
                class: `min-h-40 w-full rounded-md border border-slate-50 px-0 py-3 font-sans mb-1 leading-normal focus:outline-0 dark:bg-[rgba(255,255,255,0.08)] dark:border-none dark:text-neutral-300 cursor-text`
            }
        }
    });

    const focused = editor?.isFocused || !editor?.isEmpty;

    const getHTML = () => {
        // Convert newlines to <br> for now (until we add a real editor)
        return editor.getHTML();
    };

    const submitForm = async (event) => {
        event.preventDefault();

        if (editor.isEmpty) {
            return;
        }

        try {
            // Send comment to server
            await onAction('addComment', {
                post_id: postId,
                status: 'published',
                html: getHTML()
            });

            // Clear message and blur on success
            editor.chain().clearContent().blur().run();
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e);
        }
    };

    const focusEditor = (event) => {
        editor.commands.focus();
    };

    return (
        <form onClick={focusEditor} className={`comment-form transition duration-200 rounded-md px-3 pt-3 pb-2 -ml-[13px] -mr-3 -mt-[15px] mb-10 shadow-lg hover:shadow-xl ${focused ? 'cursor-default' : 'cursor-pointer'}`}>
            <div className="w-full relative">
                <div className="pr-3 font-sans leading-normal dark:text-neutral-300">
                    <div className="relative w-full">
                        {/* This animation doesn't work yet because of the editor needing two divs */}
                        <EditorContent
                            className={`transition-[height] duration-150 w-full pl-[56px] px-0 py-[14px] ${focused ? 'mt-8' : '-mt-[2px] mb-1'} ${focused ? 'cursor-text h-40' : 'cursor-pointer overflow-hidden h-11 hover:border-slate-300'}`}
                            editor={editor} 
                        />
                        <button
                            className={`transition-[opacity] duration-150 absolute -right-[9px] bottom-[4px] rounded-md border py-3 px-4 font-sans text-sm text-center bg-black font-semibold text-white dark:bg-[rgba(255,255,255,0.8)] dark:text-neutral-800`}
                            type="button"
                            onClick={submitForm}
                        >
                            Add comment
                        </button>
                    </div>
                </div>
                <div className="flex mb-1 justify-start items-center absolute top-[2px] left-0">
                    <Avatar saturation={props.avatarSaturation} />
                    <Transition
                        show={focused}
                        enter="transition duration-500 ease-in-out"
                        enterFrom="opacity-0 -translate-x-2"
                        enterTo="opacity-100 translate-x-0"
                        leave="transition-none duration-0"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="ml-3">
                            <h4 className="text-lg font-sans font-semibold mb-1 tracking-tight dark:text-neutral-300">{member.name ? member.name : 'Anonymous'}</h4>
                        </div>
                    </Transition>
                </div>
            </div>
        </form>
    );
};
  
export default AddForm;
