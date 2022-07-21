import React, {useContext, useEffect, useState, useRef} from 'react';
import {Transition} from '@headlessui/react';
import AppContext from '../AppContext';
import Avatar from './Avatar';
import {useEditor, EditorContent} from '@tiptap/react';
import {getEditorConfig} from '../utils/editor';
import AddNameDialog from './modals/AddNameDialog';

const Form = (props) => {
    const {member, postId, dispatchAction, onAction, avatarSaturation} = useContext(AppContext);
    const [isAddNameShowing, setAddNameShowing] = useState(false);
    const formEl = useRef(null);

    let config;
    if (props.isReply) {
        config = {
            placeholder: 'Reply to comment',
            autofocus: true
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

    // const isInViewport = () => {
    //     const top = formEl.current.getBoundingClientRect().top;
    //     return (top >= 0 && top <= window.innerHeight);
    // };

    const getScrollToPosition = () => {
        let yOffset = -100; 
        const element = formEl.current;

        // Because we are working in an iframe, we need to resolve the position inside this iframe to the position in the top window
        // Get the window of the element, not the window (which is the top window)
        let currentWindow = element.ownerDocument.defaultView;

        // Loop all iframe parents (if we have multiple)
        while (currentWindow !== window) {
            const currentParentWindow = currentWindow.parent;
            for (let idx = 0; idx < currentParentWindow.frames.length; idx++) {
                if (currentParentWindow.frames[idx] === currentWindow) {
                    for (let frameElement of currentParentWindow.document.getElementsByTagName('iframe')) {
                        if (frameElement.contentWindow === currentWindow) {
                            const rect = frameElement.getBoundingClientRect();
                            yOffset += rect.top + currentWindow.pageYOffset;
                        }
                    }
                    currentWindow = currentParentWindow;
                    break;
                }
            }
        }

        const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
        return y;
    };

    // Set the cursor position at the end of the form, instead of the beginning (= when using autofocus)
    useEffect(() => {
        if (!editor) {
            return;
        }

        // Scroll to view if it's a reply
        if (props.isReply) {
            setTimeout(() => {
                window.scrollTo({
                    top: getScrollToPosition(),
                    left: 0,
                    behavior: 'smooth'
                });
            }, 100);
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
    }, [editor, props.isEdit, props.isReply]);

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
    const isFocused = editor?.isFocused || !editor?.isEmpty;

    const focusEditor = (event) => {
        event.stopPropagation();

        if (memberName) {
            editor.commands.focus();
        } else {
            setAddNameShowing(true);
        }
    };

    const closeAddName = () => {
        setAddNameShowing(false);
    };

    const saveAddName = () => {
        setAddNameShowing(false);
        editor.commands.focus();
    };

    let submitText;
    if (props.isReply) {
        submitText = 'Add reply';
    } else if (props.isEdit) {
        submitText = 'Save';
    } else {
        submitText = 'Add comment';
    }

    return (
        <>
            <form ref={formEl} onClick={focusEditor} className={`
                transition duration-200
                -mt-[12px] -mr-3 mb-10 -ml-[12px] pt-3 pb-2 px-3
                bg-white dark:bg-[rgba(255,255,255,0.08)]
                rounded-md shadow-formlg dark:shadow-transparent hover:shadow-formxl
                ${!commentsCount && !props.isEdit && !props.isReply && '-mt-0 -mr-0 -ml-0'}
                ${isFocused ? 'cursor-default' : 'cursor-pointer'}`
            }>
                <div className="w-full relative">
                    <div className="pr-3 font-sans leading-normal dark:text-neutral-300">
                        <div className="relative w-full">
                            <EditorContent
                                className={`
                                    transition-all duration-150 delay-100
                                    w-full pl-[56px] px-0 py-[10px] pr-4
                                    bg-transparent rounded-md border-none border border-slate-50 dark:border-none
                                    font-sans text-[16.5px] leading-normal dark:text-neutral-300 
                                    focus:outline-0
                                    placeholder:text-neutral-300 dark:placeholder:text-[rgba(255,255,255,0.3)]  
                                    resize-none
                                    ${isFocused ? 'cursor-textmin-h-[144px] pt-[44px] pb-[68px]' : 'cursor-pointer overflow-hidden min-h-[48px] hover:border-slate-300'}
                                    ${props.isEdit && 'cursor-text'}
                                    ${!memberName && 'pointer-events-none'}
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
                                        rounded-[6px] border
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
                        <Avatar comment={comment} saturation={avatarSaturation} className="pointer-events-none" />
                        <Transition
                            show={isFocused}
                            enter="transition duration-500 delay-100 ease-in-out"
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
            <AddNameDialog show={isAddNameShowing} submit={saveAddName} cancel={closeAddName} />
        </>
    );
};
  
export default Form;
