import React from 'react';
import {Avatar} from '../Avatar';
import {Comment, useAppContext} from '../../../AppContext';
import {ReactComponent as EditIcon} from '../../../images/icons/edit.svg';
import {Editor, EditorContent} from '@tiptap/react';
import {ReactComponent as SpinnerIcon} from '../../../images/icons/spinner.svg';
import {Transition} from '@headlessui/react';
import {useCallback, useEffect, useRef, useState} from 'react';
import {usePopupOpen} from '../../../utils/hooks';

type Progress = 'default' | 'sending' | 'sent' | 'error';
export type SubmitSize = 'small' | 'medium' | 'large';
type FormEditorProps = {
    submit: (data: {html: string}) => Promise<void>;
    progress: Progress;
    setProgress: (progress: Progress) => void;
    close?: () => void;
    reduced?: boolean;
    isOpen: boolean;
    editor: Editor | null;
    submitText: JSX.Element | null;
    submitSize: SubmitSize;
};
const FormEditor: React.FC<FormEditorProps> = ({submit, progress, setProgress, close, reduced, isOpen, editor, submitText, submitSize}) => {
    const {t} = useAppContext();
    let buttonIcon = null;

    if (progress === 'sending') {
        submitText = null;
        buttonIcon = <SpinnerIcon className="h-[24px] w-[24px] fill-white dark:fill-black" />;
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
        <div className={`relative w-full pl-[40px] transition-[padding] delay-100 duration-150 sm:pl-[44px] ${reduced && 'pl-0'} ${isOpen && 'pl-[1px] pt-[56px] sm:pl-[52px] sm:pt-[64px]'}`}>
            <div
                className={`shadow-form hover:shadow-formxl text-md w-full rounded-md border border-none border-slate-50 bg-[rgba(255,255,255,0.9)] px-2 font-sans leading-normal transition-all delay-100 duration-150 focus:outline-0 sm:px-3 sm:text-lg dark:border-none dark:bg-[rgba(255,255,255,0.08)] dark:text-neutral-300 dark:shadow-transparent ${isOpen ? 'min-h-[144px] cursor-text py-2 pb-[68px]' : 'min-h-[48px] cursor-pointer overflow-hidden py-3 hover:border-slate-300 sm:py-4'}
            `}
                data-testid="form-editor">
                <EditorContent
                    editor={editor} onMouseDown={stopIfFocused}
                    onTouchStart={stopIfFocused}
                />
            </div>
            <div className="absolute bottom-1 right-1 flex space-x-4 transition-[opacity] duration-150 sm:bottom-2 sm:right-2">
                {close &&
                    <button className="ml-2.5 font-sans text-sm font-medium text-neutral-500 outline-0 dark:text-neutral-400" type="button" onClick={close}>{t('Cancel')}</button>
                }
                <button
                    className={`flex w-auto items-center justify-center ${submitSize === 'medium' && 'sm:min-w-[100px]'} ${submitSize === 'small' && 'sm:min-w-[64px]'} h-[40px] rounded-[6px] border bg-neutral-900 px-3 py-2 text-center font-sans text-base font-medium text-white outline-0 transition-[opacity] duration-150 sm:text-sm dark:bg-[rgba(255,255,255,0.9)] dark:text-neutral-800`}
                    data-testid="submit-form-button"
                    type="button"
                    onClick={submitForm}
                >
                    <span>{buttonIcon}</span>
                    {submitText && <span>{submitText}</span>}
                </button>
            </div>
        </div>
    );
};

type FormHeaderProps = {
    show: boolean;
    name: string | null;
    expertise: string | null;
    editName: () => void;
    editExpertise: () => void;
};

const FormHeader: React.FC<FormHeaderProps> = ({show, name, expertise, editName, editExpertise}) => {
    return (
        <Transition
            enter="transition duration-500 delay-100 ease-in-out"
            enterFrom="opacity-0 -translate-x-2"
            enterTo="opacity-100 translate-x-0"
            leave="transition-none duration-0"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            show={show}
        >
            <div className="flex">
                <div
                    className="font-sans text-base font-bold leading-snug text-[rgb(23,23,23)] sm:text-sm dark:text-[rgba(255,255,255,0.85)]"
                    data-testid="member-name"
                    onClick={editName}
                >
                    {name ? name : 'Anonymous'}
                </div>
                <div className="flex items-baseline justify-start">
                    <button
                        className={`group flex items-center justify-start whitespace-nowrap text-left font-sans text-base leading-snug text-[rgba(0,0,0,0.5)] transition duration-150 hover:text-[rgba(0,0,0,0.75)] sm:text-sm dark:text-[rgba(255,255,255,0.5)] dark:hover:text-[rgba(255,255,255,0.4)] ${!expertise && 'text-[rgba(0,0,0,0.3)] hover:text-[rgba(0,0,0,0.5)] dark:text-[rgba(255,255,255,0.3)]'}`}
                        data-testid="expertise-button"
                        type="button"
                        onClick={editExpertise}
                    >
                        <span><span className="mx-[0.3em]">·</span>{expertise ? expertise : 'Add your expertise'}</span>
                        {expertise && <EditIcon className="ml-1 h-[12px] w-[12px] translate-x-[-6px] stroke-[rgba(0,0,0,0.5)] opacity-0 transition-all duration-100 ease-out group-hover:translate-x-0 group-hover:stroke-[rgba(0,0,0,0.75)] group-hover:opacity-100 dark:stroke-[rgba(255,255,255,0.5)] dark:group-hover:stroke-[rgba(255,255,255,0.3)]" />}
                    </button>
                </div>
            </div>
        </Transition>
    );
};

type FormProps = {
    comment?: Comment;
    submit: (data: {html: string}) => Promise<void>;
    submitText: JSX.Element;
    submitSize: SubmitSize;
    close?: () => void;
    editor: Editor | null;
    reduced: boolean;
    isOpen: boolean;
};

const Form: React.FC<FormProps> = ({comment, submit, submitText, submitSize, close, editor, reduced, isOpen}) => {
    const {member, dispatchAction} = useAppContext();
    const isAskingDetails = usePopupOpen('addDetailsPopup');
    const [progress, setProgress] = useState<Progress>('default');
    const formEl = useRef(null);

    const memberName = member?.name ?? comment?.member?.name;
    const memberExpertise = member?.expertise ?? comment?.member?.expertise;

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

    const openEditDetails = useCallback((options) => {
        editor?.commands?.blur();

        dispatchAction('openPopup', {
            type: 'addDetailsPopup',
            expertiseAutofocus: options.expertiseAutofocus ?? false,
            callback: function (succeeded: boolean) {
                if (!editor || !formEl.current) {
                    return;
                }

                // Don't use focusEditor to avoid loop
                if (!succeeded) {
                    return;
                }

                // useEffect is not fast enought to enable it
                editor.setEditable(true);
                editor.commands.focus();
            }
        });
    }, [editor, dispatchAction, formEl]);

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

    useEffect(() => {
        if (!editor) {
            return;
        }

        // Disable editing if the member doesn't have a name or when we are submitting the form
        editor.setEditable(!!memberName && progress !== 'sending');
    }, [editor, memberName, progress]);

    return (
        <form ref={formEl} className={`-mx-3 mb-7 mt-[-10px] rounded-md px-3 pb-2 pt-3 transition duration-200 ${isOpen ? 'cursor-default' : 'cursor-pointer'} ${reduced && 'pl-1'}`} data-testid="form" onClick={focusEditor} onMouseDown={preventIfFocused} onTouchStart={preventIfFocused}>
            <div className="relative w-full">
                <div className="pr-[1px] font-sans leading-normal dark:text-neutral-300">
                    <FormEditor close={close} editor={editor} isOpen={isOpen} progress={progress} reduced={reduced} setProgress={setProgress} submit={submit} submitSize={submitSize} submitText={submitText} />
                </div>
                <div className='absolute left-0 top-1 flex h-11 w-full items-center justify-start sm:h-12'>
                    <div className="pointer-events-none mr-2 grow-0 sm:mr-3">
                        <Avatar comment={comment} />
                    </div>
                    <div className="grow-1 w-full">
                        <FormHeader editExpertise={editExpertise} editName={editName} expertise={memberExpertise} name={memberName} show={isOpen} />
                    </div>
                </div>
            </div>
        </form>
    );
};

export default Form;
