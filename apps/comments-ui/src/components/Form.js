import React, {useCallback, useContext, useEffect, useRef, useState} from 'react';
import {Transition} from '@headlessui/react';
import AppContext from '../AppContext';
import Avatar from './Avatar';
import {useEditor, EditorContent} from '@tiptap/react';
import {getEditorConfig} from '../utils/editor';
import {isMobile} from '../utils/helpers';
import {formatRelativeTime} from '../utils/helpers';
import {ReactComponent as SpinnerIcon} from '../images/icons/spinner.svg';

const Form = (props) => {
    const {member, postId, dispatchAction, avatarSaturation} = useContext(AppContext);
    const [isFormOpen, setFormOpen] = useState(props.isReply || props.isEdit ? true : false);
    const formEl = useRef(null);
    const [progress, setProgress] = useState('default');

    // Prevent closing on blur (required when showing name dialog)
    const [preventClosing, setPreventClosing] = useState(false);

    const {comment, commentsCount} = props;
    const memberName = (props.isEdit ? comment.member.name : member.name); 
    // const memberBio = false; // TODO: needed for bio to be wired up

    let buttonIcon = null;
    if (progress === 'sending') {
        buttonIcon = <SpinnerIcon className="w-[24px] h-[24px] fill-white" />;
    } else if (progress === 'sent') {
        buttonIcon = null;
    }
    
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
            placeholder: (commentsCount === 0 ? 'Be first to start the conversation' : 'Join the discussion'),
            autofocus: false
        };
    }

    const editor = useEditor({
        ...getEditorConfig(config)
    });

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

    const onFormFocus = useCallback(() => {
        if (!memberName && !props.isEdit) {
            setPreventClosing(true);
            editor.commands.blur();
            dispatchAction('openPopup', {
                type: 'addDetailsDialog',
                callback: (succeeded) => {
                    if (succeeded) {
                        editor.commands.focus();
                    } else {
                        if (props.close) {
                            props.close();
                        }
                    }
                    setPreventClosing(false);
                }
            });
        } else {
            setFormOpen(true);
        }
    }, [editor, dispatchAction, memberName, props]);

    // Set the cursor position at the end of the form, instead of the beginning (= when using autofocus)
    useEffect(() => {
        if (!editor) {
            return;
        }

        let timer;

        // Scroll to view if it's a reply
        if (props.isReply) {
            timer = setTimeout(() => {
                window.scrollTo({
                    top: getScrollToPosition(),
                    left: 0,
                    behavior: 'smooth'
                });
            }, 100);
        }

        // Focus editor + jump to end
        if (!props.isEdit) {
            return () => {
                if (timer) {
                    clearTimeout(timer);
                }
            };
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

        return () => {
            if (timer) {
                clearTimeout(timer);
            }
        };
    }, [editor, props]);

    const submitForm = useCallback(async () => {
        if (editor.isEmpty) {
            return;
        }

        setProgress('sending');

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
                setProgress('sent');

                props.close();
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

            setProgress('sent');
            props.close();
        } else {
            try {
                // Send comment to server
                await dispatchAction('addComment', {
                    post_id: postId,
                    status: 'published',
                    html: editor.getHTML()
                });

                // Clear message and blur on success
                editor.chain().clearContent().blur().run();
                setFormOpen(false);
                setProgress('sent');
            } catch (e) {
                // eslint-disable-next-line no-console
                console.error(e);
            }
        }

        return false;
    }, [editor, props, dispatchAction, postId]);

    useEffect(() => {
        if (!editor) {
            return;
        }

        editor.on('focus', () => {
            onFormFocus();
        });

        editor.on('blur', () => {
            if (editor?.isEmpty) {
                setFormOpen(false);
                if (props.isReply && props.close && !preventClosing) {
                    // TODO: we cannot toggle the form when this happens, because when the member doesn't have a name we'll always loose focus to input the name...
                    // Need to find a different way for this behaviour
                    props.close();
                }
            }
        });

        // Add some basic keyboard shortcuts
        // ESC to blur the editor
        const keyDownListener = (event) => {
            if (event.metaKey) {
                // CMD on MacOS

                if (event.key === 'Escape' && editor?.isFocused) {
                    // Try submit
                    submitForm();
                }

                return;
            }
            if (event.key === 'Escape') {
                if (editor?.isFocused && !preventClosing) {
                    if (props.close) {
                        props.close();
                    } else {
                        editor?.commands.blur();
                    }
                }
                return;
            }

            if (event.key === 'c' && !props.isEdit && !props.isReply && !editor?.isFocused) {
                editor?.commands.focus();
                window.scrollTo({
                    top: getScrollToPosition(),
                    left: 0,
                    behavior: 'smooth'
                });
                return;
            }
        };

        // Note: normally we would need to attach this listener to the window + the iframe window. But we made listener
        // in the Iframe component that passes down all the keydown events to the main window to prevent that
        window.addEventListener('keydown', keyDownListener, {passive: true});

        return () => {
            window.removeEventListener('keydown', keyDownListener, {passive: true});

            // Remove previous events
            editor?.off('focus');
            editor?.off('blur');
        };
    }, [editor, props, onFormFocus, preventClosing, submitForm]);

    const preventIfFocused = (event) => {
        if (editor.isFocused) {
            event.preventDefault();
            return;
        }
    };

    const stopIfFocused = (event) => {
        if (editor.isFocused) {
            event.stopPropagation();
            return;
        }
    };

    const focusEditor = (event) => {
        if (editor.isFocused) {
            return;
        }
        editor.commands.focus();
    };

    // TODO: needed for bio to be wired up
    // const handleAddBio = (event) => {
    //     event.preventDefault();

    //     dispatchAction('openPopup', {
    //         type: 'addDetailsDialog',
    //         callback: () => {
    //             editor.commands.focus();
    //         }
    //     });
    // };

    let submitText;
    if (props.isReply) {
        submitText = <><span className="hidden sm:inline">Add </span><span className="capitalize sm:normal-case">reply</span></>;
    } else if (props.isEdit) {
        submitText = 'Save';
    } else {
        submitText = <><span className="hidden sm:inline">Add </span><span className="capitalize sm:normal-case">comment</span></>;
    }

    if (progress === 'sending') {
        submitText = null;
    }

    const shouldFormBeReduced = (isMobile() && props.isReply) || (isMobile() && props.isEdit);

    // Keep the form always open when replying or editing (hide on blur)
    const isFormReallyOpen = props.isReply || props.isEdit || isFormOpen;

    return (
        <>
            <form ref={formEl} onClick={focusEditor} onMouseDown={preventIfFocused} onTouchStart={preventIfFocused} className={`
                transition duration-200
                pt-3 pb-2 px-3
                -mt-[12px] -mr-3 mb-10 -ml-[12px]
                rounded-md
                ${!commentsCount && !props.isEdit && !props.isReply && 'mt-0 ml-0 mr-0'}
                ${isFormReallyOpen ? 'cursor-default' : 'cursor-pointer'}
                ${(!props.isReply && !props.isEdit) && '-mt-[4px]'}
                ${(props.isReply || props.isEdit) && '-mt-[16px]'}
                ${shouldFormBeReduced && 'pl-1'}
            `}>
                <div className="w-full relative">
                    <div className="pr-[1px] font-sans leading-normal dark:text-neutral-300">
                        <div className={`transition-[padding] duration-150 delay-100 relative w-full pl-[52px] ${shouldFormBeReduced && 'pl-0'} ${isFormReallyOpen && 'pt-[64px]'}`}>
                            <div
                                className={`
                                transition-all duration-150 delay-100
                                w-full px-3 py-4
                                bg-transparent dark:bg-[rgba(255,255,255,0.08)]
                                rounded-md border-none border border-slate-50 dark:border-none
                                font-sans text-[16.5px] leading-normal dark:text-neutral-300 
                                focus:outline-0
                                shadow-form hover:shadow-formxl dark:shadow-transparent
                                ${commentsCount === 0 && 'placeholder:text-neutral-700'}
                                ${isFormReallyOpen ? 'cursor-text min-h-[144px] pb-[68px] pt-2' : 'cursor-pointer overflow-hidden min-h-[48px] hover:border-slate-300'}
                                ${props.isEdit && 'cursor-text'}
                                ${!memberName && 'pointer-events-none'}
                            `}>
                                <EditorContent
                                    onMouseDown={stopIfFocused} onTouchStart={stopIfFocused}
                                    editor={editor} 
                                />
                            </div>
                            <div className="
                                absolute right-[9px] bottom-[9px]
                                flex space-x-4
                                transition-[opacity] duration-150 
                            ">
                                {(props.isEdit || props.isReply) &&
                                    <button type="button" onClick={props.close} className="font-sans text-sm font-medium ml-2.5 text-neutral-500 dark:text-neutral-400">Cancel</button>}
                                <button
                                    className={`
                                        flex items-center justify-center w-32 h-[39px]
                                        transition-[opacity] duration-150
                                        bg-neutral-900 dark:bg-[rgba(255,255,255,0.9)]
                                        rounded-[6px] border
                                        py-2 px-3
                                        text-sm text-center font-sans font-semibold
                                        text-white dark:text-neutral-800
                                    `}
                                    type="button"
                                    onClick={submitForm}
                                >
                                    <span>{buttonIcon}</span>
                                    {submitText && <span>{submitText}</span>}
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className='absolute top-1 left-0 flex justify-start items-center h-12'>
                        <div className="mr-3">
                            <Avatar comment={comment} saturation={avatarSaturation} className="pointer-events-none" />
                        </div>
                        <div>
                            <Transition
                                show={isFormReallyOpen}
                                enter="transition duration-500 delay-100 ease-in-out"
                                enterFrom="opacity-0 -translate-x-2"
                                enterTo="opacity-100 translate-x-0"
                                leave="transition-none duration-0"
                                leaveFrom="opacity-100"
                                leaveTo="opacity-0"
                            >
                                <h4 className="text-[17px] font-sans font-bold tracking-tight dark:text-[rgba(255,255,255,0.85)]">{memberName ? memberName : 'Anonymous'}</h4>
                                <div className="flex items-baseline font-sans text-[14px] tracking-tight text-neutral-400 dark:text-[rgba(255,255,255,0.5)]">
                                    {/* TODO: bio text field ready for wiring up
                                    {memberBio ?
                                        <div>{memberBio}</div> :
                                        <button className="transition duration-150 hover:text-neutral-500" onClick={handleAddBio}>Add your bio</button>
                                    } */}
                                    <div>{props.isEdit ? formatRelativeTime(comment.created_at) : 'Now'}</div>
                                </div>
                            </Transition>
                        </div>
                    </div>
                </div>
            </form>
        </>
    );
};
  
export default Form;
