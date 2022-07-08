import React, {useContext} from 'react';
import {Transition} from '@headlessui/react';
import AppContext from '../AppContext';
import Avatar from './Avatar';
import {useEditor, EditorContent} from '@tiptap/react';
import {getEditorConfig} from '../utils/editor';

const Form = (props) => {
    const {member, postId, dispatchAction, onAction, avatarSaturation} = useContext(AppContext);

    let config;
    if (props.isReply) {
        config = {
            placeholder: 'Reply to comment',
            autofocus: false
        };
    } else if (props.isEdit) {
        config = {
            placeholder: 'Edit this comment',
            autofocus: true,
            content: props.comment.html
        };
    } else {
        config = {
            placeholder: 'Join the discussion',
            autofocus: false
        };
    }

    const editor = useEditor({
        ...getEditorConfig(config)
    });

    const focused = editor?.isFocused || !editor?.isEmpty;

    const submitForm = async (event) => {
        event.preventDefault();

        if (editor.isEmpty) {
            return;
        }

        if (props.isReply) {
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
        } else if (props.isEdit) {
            // Send comment to server
            await dispatchAction('editComment', {
                comment: {
                    id: props.comment.id,
                    html: editor.getHTML()
                },
                parent: props.parent
            });
            
            props.toggle();
        } else {
            try {
                // Send comment to server
                await onAction('addComment', {
                    post_id: postId,
                    status: 'published',
                    html: editor.getHTML()
                });

                // Clear message and blur on success
                editor.chain().clearContent().blur().run();
            } catch (e) {
                // eslint-disable-next-line no-console
                console.error(e);
            }
        }

        return false;
    };

    const focusEditor = (event) => {
        editor.commands.focus();
    };

    const {comment, commentsCount} = props;
    const memberName = (props.isEdit ? comment.member.name : member.name); 

    let submitText;
    if (props.isReply) {
        submitText = 'Add reply';
    } else if (props.isEdit) {
        submitText = 'Edit comment';
    } else {
        submitText = 'Add comment';
    }

    return (
        <form onClick={focusEditor} className={`
            comment-form
            bg-white
            transition
            duration-200
            rounded-md
            px-3
            pt-3
            pb-2
            mb-10
            -mt-[16px]
            -ml-[12px]
            -mr-3
            shadow-lg
            dark:bg-[rgba(255,255,255,0.08)]
            dark:shadow-transparent
            hover:shadow-xl
            ${commentsCount && '-ml-[12px] -mr-3'}
            ${focused ? 'cursor-default' : 'cursor-pointer'}`
        }>
            <div className="w-full relative">
                <div className="pr-3 font-sans leading-normal dark:text-neutral-300">
                    <div className="relative w-full">
                        <EditorContent
                            className={`transition-[min-height] pl-[56px] px-0 py-[14px] ${focused ? 'pt-[48px] pb-[68px]' : 'mb-1'} duration-150 bg-transparent w-full placeholder:text-neutral-300 dark:placeholder:text-[rgba(255,255,255,0.3)] border-none resize-none rounded-md border border-slate-50 font-sans text-[16.5px] leading-normal focus:outline-0 dark:border-none dark:text-neutral-300 ${focused ? 'cursor-text min-h-[144px]' : 'cursor-pointer overflow-hidden min-h-[56px] hover:border-slate-300'}`}
                            editor={editor} 
                        />
                        <div className="flex space-x-4 transition-[opacity] duration-150 absolute -right-3 bottom-1">
                            {props.isEdit && <button type="button" className="font-sans text-sm font-medium ml-2.5 text-neutral-500 dark:text-neutral-400" onClick={props.toggle}>Cancel</button>}
                            <button
                                className={`transition-[opacity] duration-150 rounded-[4px] border py-3 px-4 font-sans text-sm text-center bg-neutral-900 font-semibold text-white dark:bg-[rgba(255,255,255,0.9)] dark:text-neutral-800`}
                                type="button"
                                onClick={submitForm}
                            >
                                {submitText}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="flex mb-1 justify-start items-center absolute top-[4px] left-0">
                    <Avatar saturation={avatarSaturation} />
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
                            <h4 className="text-lg font-sans font-semibold mb-1 tracking-tight dark:text-neutral-300">{memberName ? memberName : 'Anonymous'}</h4>
                        </div>
                    </Transition>
                </div>
            </div>
        </form>
    );
};
  
export default Form;
