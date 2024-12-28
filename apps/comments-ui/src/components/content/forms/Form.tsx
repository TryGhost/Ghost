import React from 'react';
import {Avatar} from '../Avatar';
import {Comment, OpenCommentForm, useAppContext} from '../../../AppContext';
import {ReactComponent as EditIcon} from '../../../images/icons/edit.svg';
import {Editor, EditorContent} from '@tiptap/react';
import {ReactComponent as SpinnerIcon} from '../../../images/icons/spinner.svg';
import {Transition} from '@headlessui/react';
import {useCallback, useEffect, useRef, useState} from 'react';
import {usePopupOpen} from '../../../utils/hooks';

export type Progress = 'default' | 'sending' | 'sent' | 'error';
export type SubmitSize = 'small' | 'medium' | 'large';
export type FormEditorProps = {
    comment?: Comment;
    submit: (data: {html: string}) => Promise<void>;
    progress: Progress;
    setProgress: (progress: Progress) => void;
    close?: () => void;
    reduced?: boolean;
    isOpen: boolean;
    editor: Editor | null;
    submitText: React.ReactNode;
    submitSize: SubmitSize;
    openForm?: OpenCommentForm;
};

export const FormEditor: React.FC<FormEditorProps> = ({comment, submit, progress, setProgress, close, isOpen, editor, submitText, submitSize, openForm}) => {
    const {dispatchAction, t} = useAppContext();
    let buttonIcon = null;

    useEffect(() => {
        if (editor && openForm) {
            const checkContent = () => {
                const hasUnsavedChanges = comment && openForm.type === 'edit' ?
                    editor.getHTML() !== comment.html :
                    !editor.isEmpty;

                // avoid unnecessary state updates to prevent infinite loops
                if (openForm.hasUnsavedChanges !== hasUnsavedChanges) {
                    dispatchAction('setCommentFormHasUnsavedChanges', {id: openForm.id, hasUnsavedChanges});
                }
            };

            editor.on('update', checkContent);
            editor.on('transaction', checkContent);

            checkContent();

            return () => {
                editor.off('update', checkContent);
                editor.off('transaction', checkContent);
            };
        }
    }, [editor, comment, openForm, dispatchAction]);

    if (progress === 'sending') {
        buttonIcon = <SpinnerIcon className={`h-[24px] w-[24px] fill-white`} data-testid="button-spinner" />;
    }

    const stopIfFocused = useCallback((event) => {
        if (editor?.isFocused) {
            event.stopPropagation();
            return;
        }
    }, [editor]);

    const submitForm = useCallback(async () => {
        if (!editor || editor.isEmpty) {
            return;
        }

        setProgress('sending');

        try {
            await submit({
                html: editor.getHTML()
            });
        } catch (e) {
            setProgress('error');
            return;
        }

        if (close) {
            close();
        } else {
            // Clear message and blur
            setProgress('sent');
            editor.chain().clearContent().blur().run();
        }
        return false;
    }, [setProgress, editor, submit, close]);

    // Keyboard shortcuts to submit and close/blur the form
    useEffect(() => {
        // Add some basic keyboard shortcuts
        // ESC to blur the editor
        const keyDownListener = (event: KeyboardEvent) => {
            if (event.metaKey || event.ctrlKey) {
                // CMD on MacOS or CTRL

                if (event.key === 'Enter' && editor?.isFocused) {
                    // Try submit
                    submitForm();

                    // Prevent inserting an enter in the editor
                    editor?.commands.blur();
                }

                return;
            }
            if (event.key === 'Escape') {
                if (editor?.isFocused) {
                    if (close) {
                        close();
                    } else {
                        editor?.commands.blur();
                    }
                }
                return;
            }
        };

        // Note: normally we would need to attach this listener to the window + the iframe window. But we made listener
        // in the Iframe component that passes down all the keydown events to the main window to prevent that
        window.addEventListener('keydown', keyDownListener, {passive: true});

        return () => {
            window.removeEventListener('keydown', keyDownListener, {passive: true} as any);
        };
    }, [editor, close, submitForm]);

    return (
        <>
            <div
                className={`text-md min-h-[120px] w-full rounded-lg border border-black/10 bg-white/75 p-2 pb-[68px] font-sans leading-normal transition-all delay-100 duration-150 focus:outline-0 sm:px-3 sm:text-lg dark:bg-white/10 dark:text-neutral-300 ${isOpen ? 'cursor-text' : 'cursor-pointer'}`}
                data-testid="form-editor">
                <EditorContent
                    editor={editor} onMouseDown={stopIfFocused}
                    onTouchStart={stopIfFocused}
                />
            </div>
            <div className="absolute bottom-1 right-1 flex space-x-4 transition-[opacity] duration-150 sm:bottom-2 sm:right-2">
                {close &&
                    <button className="ml-2.5 font-sans text-sm font-medium text-neutral-900/50 outline-0 transition-all hover:text-neutral-900/70 dark:text-white/60 dark:hover:text-white/75" type="button" onClick={close}>{t('Cancel')}</button>
                }
                <button
                    className={`flex w-auto items-center justify-center ${submitSize === 'medium' && 'sm:min-w-[100px]'} ${submitSize === 'small' && 'sm:min-w-[64px]'} h-[40px] rounded-md bg-[var(--gh-accent-color)] px-3 py-2 text-center font-sans text-base font-medium text-white outline-0 transition-colors duration-200 hover:brightness-105 disabled:bg-black/5 disabled:text-neutral-900/30 sm:text-sm dark:disabled:bg-white/15 dark:disabled:text-white/35`}
                    data-testid="submit-form-button"
                    disabled={!editor || editor.isEmpty}
                    type="button"
                    onClick={submitForm}
                >
                    {buttonIcon && <span className="mr-1">{buttonIcon}</span>}
                    {submitText && <span>{submitText}</span>}
                </button>
            </div>
        </>
    );
};

type FormHeaderProps = {
    show: boolean;
    name: string | null;
    expertise: string | null;
    replyingToId?: string;
    replyingToText?: string;
    editName: () => void;
    editExpertise: () => void;
};

const FormHeader: React.FC<FormHeaderProps> = ({show, name, expertise, replyingToText, editName, editExpertise}) => {
    const {t} = useAppContext();

    const isReplyingToReply = !!replyingToText;

    return (
        <Transition
            data-testid="form-header"
            enter="transition duration-500 delay-100 ease-in-out"
            enterFrom="opacity-0 -translate-x-2"
            enterTo="opacity-100 translate-x-0"
            leave="transition-none duration-0"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            show={show}
        >
            <div className="flex flex-wrap">
                <div
                    className="w-full font-sans text-base font-bold leading-snug text-neutral-900 sm:w-auto sm:text-sm dark:text-white/85"
                    data-testid="member-name"
                    onMouseDown={editName}
                >
                    {name ? name : 'Anonymous'}
                </div>
                <div className="flex items-baseline justify-start">
                    <button
                        className={`group flex items-center justify-start whitespace-nowrap text-left font-sans text-base leading-snug text-neutral-900/50 transition duration-150 hover:text-black/75 sm:text-sm dark:text-white/60 dark:hover:text-white/75 ${!expertise && 'text-black/30 hover:text-black/50 dark:text-white/30 dark:hover:text-white/50'}`}
                        data-testid="expertise-button"
                        type="button"
                        onMouseDown={editExpertise}
                    >
                        <span><span className="mx-[0.3em] hidden sm:inline">·</span>{expertise ? expertise : 'Add your expertise'}</span>
                        {expertise && <EditIcon className="ml-1 h-[12px] w-[12px] translate-x-[-6px] stroke-black/50 opacity-0 transition-all duration-100 ease-out group-hover:translate-x-0 group-hover:stroke-black/75 group-hover:opacity-100 dark:stroke-white/60 dark:group-hover:stroke-white/75" />}
                    </button>
                </div>
            </div>
            {isReplyingToReply && (
                <div className="mt-0.5 line-clamp-1 font-sans text-base leading-snug text-neutral-900/50 sm:text-sm dark:text-white/60" data-testid="replying-to">
                    <span>{t('Reply to')}:</span>&nbsp;<span className="font-semibold text-neutral-900/60 dark:text-white/70">{replyingToText}</span>
                </div>
            )}
        </Transition>
    );
};

type FormProps = {
    comment?: Comment;
    editor: Editor | null;
    submit: (data: {html: string}) => Promise<void>;
    submitText: React.ReactNode;
    submitSize: SubmitSize;
    close?: () => void;
    isOpen: boolean;
    reduced: boolean;
    openForm?: OpenCommentForm;
};

const Form: React.FC<FormProps> = ({
    comment,
    submit,
    submitText,
    submitSize,
    close,
    editor,
    reduced,
    isOpen,
    openForm
}) => {
    const {member} = useAppContext();
    const isAskingDetails = usePopupOpen('addDetailsPopup');
    const [progress, setProgress] = useState<Progress>('default');
    const formEl = useRef(null);

    const memberName = member?.name ?? comment?.member?.name;

    if (progress === 'sending' || (memberName && isAskingDetails)) {
        // Force open
        isOpen = true;
    }

    const preventIfFocused = (event: React.SyntheticEvent) => {
        if (editor?.isFocused) {
            event.preventDefault();
            return;
        }
    };

    useEffect(() => {
        if (!editor) {
            return;
        }

        // Disable editing if the member doesn't have a name or when we are submitting the form
        editor.setEditable(!!memberName && progress !== 'sending');
    }, [editor, memberName, progress]);

    return (
        <form
            ref={formEl}
            data-testid="form"
            onMouseDown={preventIfFocused}
            onTouchStart={preventIfFocused}
        >
            <FormEditor
                close={close}
                comment={comment}
                editor={editor}
                isOpen={isOpen}
                openForm={openForm}
                progress={progress}
                reduced={reduced}
                setProgress={setProgress}
                submit={submit}
                submitSize={submitSize}
                submitText={submitText}
            />
        </form>
    );
};

type FormWrapperProps = {
    comment?: Comment;
    editor: Editor | null;
    isOpen: boolean;
    reduced: boolean;
    openForm?: OpenCommentForm;
    children: React.ReactNode;
};

const FormWrapper: React.FC<FormWrapperProps> = ({
    comment,
    editor,
    isOpen,
    reduced,
    openForm,
    children
}) => {
    const {member, dispatchAction} = useAppContext();

    const memberName = member?.name ?? comment?.member?.name;
    const memberExpertise = member?.expertise ?? comment?.member?.expertise;

    let openStyles = '';
    if (isOpen) {
        const isReplyToReply = !!openForm?.in_reply_to_snippet;
        openStyles = isReplyToReply ? 'pl-[1px] pt-[68px] sm:pl-[44px] sm:pt-[56px]' : 'pl-[1px] pt-[48px] sm:pl-[44px] sm:pt-[40px]';
    }

    const openEditDetails = useCallback((options) => {
        editor?.commands?.blur();

        dispatchAction('openPopup', {
            type: 'addDetailsPopup',
            expertiseAutofocus: options.expertiseAutofocus ?? false,
            callback: function (succeeded: boolean) {
                if (!editor) {
                    return;
                }

                if (!succeeded) {
                    return;
                }

                editor.setEditable(true);
                editor.commands.focus();
            }
        });
    }, [editor, dispatchAction]);

    const editName = useCallback(() => {
        openEditDetails({expertiseAutofocus: false});
    }, [openEditDetails]);

    const editExpertise = useCallback(() => {
        openEditDetails({expertiseAutofocus: true});
    }, [openEditDetails]);

    const focusEditor = useCallback(() => {
        if (!editor) {
            return;
        }

        if (editor.isFocused) {
            return;
        }

        // Force to input a name first
        if (!memberName) {
            editName();
            return;
        }

        editor.commands.focus();
    }, [editor, editName, memberName]);

    return (
        <div className={`-mx-2 mt-[-10px] rounded-md transition duration-200 ${isOpen ? 'cursor-default' : 'cursor-pointer'}`}>
            <div className="relative w-full" onClick={focusEditor}>
                <div className="pr-[1px] font-sans leading-normal dark:text-neutral-300">
                    <div className={`relative mb-7 w-full pl-[40px] transition-[padding] delay-100 duration-150 sm:pl-[44px] ${reduced && 'pl-0'} ${openStyles}`}>
                        {children}
                    </div>
                </div>
                <div className='absolute left-0 top-1 flex h-11 w-full items-start justify-start sm:h-12'>
                    <div className="pointer-events-none mr-2 grow-0 sm:mr-3">
                        <Avatar member={member} />
                    </div>
                    <div className="grow-1 mt-0.5 w-full">
                        <FormHeader
                            editExpertise={editExpertise}
                            editName={editName}
                            expertise={memberExpertise}
                            name={memberName}
                            replyingToId={openForm?.in_reply_to_id}
                            replyingToText={openForm?.in_reply_to_snippet}
                            show={isOpen}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export {Form, FormWrapper};
export default Form;
