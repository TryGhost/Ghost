import React, {useContext, useEffect, useState} from 'react';
import {Transition} from '@headlessui/react';
import AppContext from '../AppContext';
import Avatar from './Avatar';
import {useEditor, EditorContent} from '@tiptap/react';
import {getEditorConfig} from '../utils/editor';
import AddNameDialog from './modals/AddNameDialog';

const Form = (props) => {
    const {member, postId, dispatchAction, onAction, avatarSaturation} = useContext(AppContext);
    const [isAddNameShowing, setAddNameShowing] = useState(false);

    let config;
    if (props.isReply) {
        config = {
            placeholder: 'Reply to comment',
            autofocus: false
        };
    } else if (props.isEdit) {
        config = {
            placeholder: 'Edit this comment',
            // warning: we cannot use autofocus on the edit field, because that sets 
            // the cursor position at the beginning of the text field instead of the end
            autofocus: false,
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

    // Set the cursor position at the end of the form, instead of the beginning (= when using autofocus)
    useEffect(() => {
        if (!editor) {
            return;
        }

        // Focus editor + jump to end
        if (!props.isEdit) {
            return;
        }

        // jump to end
        editor
            .chain()
            .focus()
            .command(({tr, commands}) => {
                return commands.setTextSelection({
                    from: tr.doc.content.size,
                    to: tr.doc.content.size
                });
            })
            .run();
    }, [editor, props.isEdit]);

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

    const {comment, commentsCount} = props;
    const memberName = (props.isEdit ? comment.member.name : member.name); 

    const focusEditor = (event) => {
        event.stopPropagation();

        if (memberName) {
            editor.commands.focus();
        } else {
            setAddNameShowing(true);
        }
        return false;
    };

    const closeAddName = () => {
        setAddNameShowing(false);
    };

    let submitText;
    if (props.isReply) {
        submitText = 'Add reply';
    } else if (props.isEdit) {
        submitText = 'Edit comment';
    } else {
        submitText = 'Add comment';
    }

    return (
        <>
            <form onClick={focusEditor} className={`
                transition duration-200
                -mt-[12px] -mr-3 mb-10 -ml-[12px] pt-3 pb-2 px-3
                bg-white dark:bg-[rgba(255,255,255,0.08)]
                rounded-md shadow-lg dark:shadow-transparent hover:shadow-xl
                ${!commentsCount && !props.isEdit && !props.isReply && '-mt-0 -mr-0 -ml-0'}
                ${focused ? 'cursor-default' : 'cursor-pointer'}`
            }>
                <div className="w-full relative">
                    <div className="pr-3 font-sans leading-normal dark:text-neutral-300">
                        <div className="relative w-full">
                            <EditorContent
                                className={`
                                    transition-all duration-150
                                    w-full pl-[56px] px-0 py-[10px] pr-4
                                    bg-transparent rounded-md border-none border border-slate-50 dark:border-none
                                    font-sans text-[16.5px] leading-normal dark:text-neutral-300 
                                    focus:outline-0
                                    placeholder:text-neutral-300 dark:placeholder:text-[rgba(255,255,255,0.3)]  
                                    resize-none
                                    ${focused ? `cursor-textmin-h-[144px] pt-[44px] pb-[68px]` : 'cursor-pointer overflow-hidden min-h-[48px] hover:border-slate-300'}
                                `}
                                editor={editor} 
                            />
                            <div className="
                                absolute -right-3 bottom-[2px]
                                flex space-x-4
                                transition-[opacity] duration-150 
                            ">
                                {props.isEdit &&
                                    <button type="button" onClick={props.toggle} className="font-sans text-sm font-medium ml-2.5 text-neutral-500 dark:text-neutral-400">Cancel</button>}
                                <button
                                    className={`
                                        transition-[opacity] duration-150
                                        bg-neutral-900 dark:bg-[rgba(255,255,255,0.9)]
                                        rounded-[4px] border
                                        py-3 px-4
                                        text-sm text-center font-sans font-semibold
                                        text-white dark:text-neutral-800
                                    `}
                                    type="button"
                                    onClick={submitForm}
                                >
                                    {submitText}
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="flex mb-1 justify-start items-center absolute top-0 left-0">
                        <Avatar comment={comment} saturation={avatarSaturation} />
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
            <AddNameDialog show={isAddNameShowing} submit={closeAddName} cancel={closeAddName} />
        </>
    );
};
  
export default Form;
