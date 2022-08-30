import React, {useCallback, useContext, useEffect, useRef, useState} from 'react';
import {Transition} from '@headlessui/react';
import AppContext from '../AppContext';
import Avatar from './Avatar';
import {useEditor, EditorContent} from '@tiptap/react';
import {getEditorConfig} from '../utils/editor';
import {isMobile} from '../utils/helpers';
import {ReactComponent as SpinnerIcon} from '../images/icons/spinner.svg';
import {ReactComponent as EditIcon} from '../images/icons/edit.svg';
import {GlobalEventBus} from '../utils/event-bus';

let formId = 0;

const Form = (props) => {
    const {member, postId, dispatchAction} = useContext(AppContext);
    const [isFormOpen, setFormOpen] = useState(props.isReply || props.isEdit ? true : false);
    const formEl = useRef(null);
    const [progress, setProgress] = useState('default');

    // Prevent closing on blur (required when showing name dialog)
    const [preventClosing, setPreventClosing] = useState(false);

    const {comment, commentsCount} = props;
    const memberName = member?.name ?? comment?.member?.name;
    const memberBio = member?.bio ?? comment?.member?.bio;

    // Keep track of the amount of open forms
    useEffect(() => {
        if (!props.isEdit && !props.isReply) {
            // General form
            return;
        }

        dispatchAction('increaseSecundaryFormCount');

        return () => {
            dispatchAction('decreaseSecundaryFormCount');
        };
    }, [dispatchAction, props.isEdit, props.isReply]);

    let buttonIcon = null;
    if (progress === 'sending') {
        buttonIcon = <SpinnerIcon className="h-[24px] w-[24px] fill-white dark:fill-black" />;
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
            placeholder: (commentsCount === 0 ? 'Start the conversation' : 'Join the discussion'),
            autofocus: false
        };
    }

    const editor = useEditor({
        ...getEditorConfig(config)
    });

    const getScrollToPosition = () => {
        let yOffset = 0; 
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

    // Generate an unique ID so we can exclude events that we send ourselve
    const [uniqueId] = useState(() => {
        formId += 1;
        return 'form-' + formId;
    });

    const onOtherFormFocus = useCallback(() => {
        // A different form got focus. Should we close this form now?
        if ((props.isReply && editor?.isEmpty) || (props.isEdit && editor?.getHTML() === props.comment.html)) {
            if (props.close) {
                props.close();
            }
        }
    }, [editor, props]);

    useEffect(() => {
        // Send event before attaching the listeer
        GlobalEventBus.addListener(uniqueId, 'form-focus', onOtherFormFocus);

        return () => {
            GlobalEventBus.removeListener(uniqueId);
        };
    }, [onOtherFormFocus, uniqueId]);

    useEffect(() => {
        // When opening a reply or edit form, try to close other forms that are open and can get closed
        if (props.isReply || props.isEdit) {
            // Send a form-focus event, but exclude ourself (uniqueId)
            GlobalEventBus.sendEvent('form-focus', {}, uniqueId);
        }
    }, [props.isReply, props.isEdit, uniqueId]);

    const onFormFocus = useCallback(() => {
        // When focusing the main form, try to close other forms that are open and can get closed
        if (!props.isReply && !props.isEdit) {
            // Send a form-focus event, but exclude ourself (uniqueId)
            GlobalEventBus.sendEvent('form-focus', {}, uniqueId);
        }
        // Send an event around and try to close other forms that are open and can get closed
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
    }, [editor, dispatchAction, memberName, props, uniqueId]);

    // Set the cursor position at the end of the form, instead of the beginning (= when using autofocus)
    useEffect(() => {
        if (!editor) {
            return;
        }

        let timer;

        // Scroll to view if it's a reply
        if (props.isReply) {
            timer = setTimeout(() => {
                // Is the form already in view?
                const formHeight = formEl.current.offsetHeight;

                // Start y position of the form
                const yMin = getScrollToPosition();

                // Y position of the end of the form
                const yMax = yMin + formHeight;

                // Trigger scrolling when yMin and yMax is closer than this to the border of the viewport
                const offset = 64;
                
                const viewportHeight = window.innerHeight;
                const viewPortYMin = window.scrollY;
                const viewPortYMax = viewPortYMin + viewportHeight;

                if (yMin - offset < viewPortYMin || yMax + offset > viewPortYMax) {
                    // Center the form in the viewport
                    const yCenter = (yMin + yMax) / 2;

                    window.scrollTo({
                        top: yCenter - viewportHeight / 2,
                        left: 0,
                        behavior: 'smooth'
                    });
                }
            }, 50);
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
    }, [editor, props.isReply, props.isEdit]);

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
            }
        });

        // Add some basic keyboard shortcuts
        // ESC to blur the editor
        const keyDownListener = (event) => {
            if (event.metaKey || event.ctrlKey) {
                // CMD on MacOS or CTRL

                if (event.key === 'Enter' && editor?.isFocused) {
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

            let focusedElement = document.activeElement;
            while (focusedElement && focusedElement.tagName === 'IFRAME') {
                if (!focusedElement.contentDocument) {
                    // CORS issue
                    // disable the C shortcut when we have a focused external iframe
                    break;
                }

                focusedElement = focusedElement.contentDocument.activeElement;
            }
            const hasInputFocused = focusedElement && (focusedElement.tagName === 'INPUT' || focusedElement.tagName === 'TEXTAREA' || focusedElement.tagName === 'IFRAME' || focusedElement.contentEditable === 'true');

            if (event.key === 'c' && !props.isEdit && !props.isReply && !editor?.isFocused && !hasInputFocused) {
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

    const handleShowDialog = (event, options) => {
        event.preventDefault();
        
        setPreventClosing(true);
        editor?.commands.blur();

        dispatchAction('openPopup', {
            type: 'addDetailsDialog',
            bioAutofocus: options.bioAutofocus ?? false,
            callback: () => {
                editor?.commands.focus();
                setPreventClosing(false);
            }
        });
    };

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
    const isFormReallyOpen = props.isReply || props.isEdit || isFormOpen || preventClosing;

    return (
        <>
            <form ref={formEl} data-testid="form" onClick={focusEditor} onMouseDown={preventIfFocused} onTouchStart={preventIfFocused} className={`-mx-3 -mt-[14px] mb-10 rounded-md px-3 pt-3 pb-2 transition duration-200 ${isFormReallyOpen ? 'cursor-default' : 'cursor-pointer'} ${(!props.isReply && !props.isEdit) && '-mt-[4px]'} ${(props.isReply || props.isEdit) && '-mt-[20px]'} ${shouldFormBeReduced && 'pl-1'}
            `}>
                <div className="relative w-full">
                    <div className="pr-[1px] font-sans leading-normal dark:text-neutral-300">
                        <div className={`relative w-full pl-[52px] transition-[padding] delay-100 duration-150 ${shouldFormBeReduced && 'pl-0'} ${isFormReallyOpen && 'pt-[64px] pl-[1px] sm:pl-[52px]'}`}>
                            <div
                                className={`w-full rounded-md border border-none border-slate-50 bg-white px-3 py-4 font-sans text-[16.5px] leading-normal shadow-form transition-all delay-100 duration-150 hover:shadow-formxl focus:outline-0 dark:border-none dark:bg-[rgba(255,255,255,0.08)] dark:text-neutral-300 dark:shadow-transparent ${commentsCount === 0 && 'placeholder:text-neutral-700'} ${isFormReallyOpen ? 'min-h-[144px] cursor-text pb-[68px] pt-2' : 'min-h-[48px] cursor-pointer overflow-hidden hover:border-slate-300'} ${props.isEdit && 'cursor-text'} ${!memberName && 'pointer-events-none'}
                            `}>
                                <EditorContent
                                    onMouseDown={stopIfFocused} onTouchStart={stopIfFocused}
                                    editor={editor} 
                                />
                            </div>
                            <div className="absolute right-[9px] bottom-[9px] flex space-x-4 transition-[opacity] duration-150">
                                {(props.isEdit || props.isReply) &&
                                    <button type="button" onClick={props.close} className="ml-2.5 font-sans text-sm font-medium text-neutral-500 outline-0 dark:text-neutral-400">Cancel</button>}
                                <button
                                    className={`flex w-auto items-center justify-center sm:w-[128px] ${props.isReply && 'sm:w-[100px]'} ${props.isEdit && 'sm:w-[64px]'} h-[39px] rounded-[6px] border bg-neutral-900 py-2 px-3 text-center font-sans text-sm font-semibold text-white outline-0 transition-[opacity] duration-150 dark:bg-[rgba(255,255,255,0.9)] dark:text-neutral-800`}
                                    type="button"
                                    data-testid="submit-form-button"
                                    onClick={submitForm}
                                >
                                    <span>{buttonIcon}</span>
                                    {submitText && <span>{submitText}</span>}
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className='absolute top-1 left-0 flex h-12 w-full items-center justify-start'>
                        <div className="mr-3 grow-0">
                            <Avatar comment={comment} className="pointer-events-none" />
                        </div>
                        <div className="grow-1 w-full">
                            <Transition
                                show={isFormReallyOpen}
                                enter="transition duration-500 delay-100 ease-in-out"
                                enterFrom="opacity-0 -translate-x-2"
                                enterTo="opacity-100 translate-x-0"
                                leave="transition-none duration-0"
                                leaveFrom="opacity-100"
                                leaveTo="opacity-0"
                            >
                                <div
                                    className="font-sans text-[17px] font-bold tracking-tight text-[rgb(23,23,23)] dark:text-[rgba(255,255,255,0.85)]"
                                    onClick={(event) => {
                                        handleShowDialog(event, {
                                            bioAutofocus: false
                                        });
                                    }}>{memberName ? memberName : 'Anonymous'}</div>
                                <div className="flex items-baseline justify-start">
                                    <button
                                        className={`group flex max-w-[80%] items-center justify-start whitespace-nowrap text-left font-sans text-[14px] tracking-tight text-neutral-400 transition duration-150 hover:text-neutral-500 dark:text-[rgba(255,255,255,0.5)] sm:max-w-[90%] ${!memberBio && 'text-neutral-300 hover:text-neutral-400'}`}
                                        onClick={(event) => {
                                            handleShowDialog(event, {
                                                bioAutofocus: true
                                            });
                                        }}><span className="... overflow-hidden text-ellipsis">{memberBio ? memberBio : 'Add your expertise'}</span>
                                        {memberBio && <EditIcon className="ml-1 h-[12px] w-[12px] -translate-x-[6px] stroke-neutral-500 opacity-0 transition-all duration-100 ease-out group-hover:translate-x-0 group-hover:opacity-100" />}
                                    </button>
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
