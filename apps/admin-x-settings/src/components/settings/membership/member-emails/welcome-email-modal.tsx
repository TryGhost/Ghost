import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React from 'react';
import {$getRoot, $isDecoratorNode} from 'lexical';
import {Button, Tabs, TabsList, TabsTrigger} from '@tryghost/shade/components';
import {Hint, type KoenigInstance, Button as LegacyButton, Modal, TextField} from '@tryghost/admin-x-design-system';
import {cn} from '@tryghost/shade/utils';
import {confirmIfDirty} from '@tryghost/admin-x-design-system';
import {useBrowseAutomatedEmails, useEditAutomatedEmail, usePreviewWelcomeEmail} from '@tryghost/admin-x-framework/api/automated-emails';
import {useCallback, useEffect, useRef, useState} from 'react';
import {useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useRouting} from '@tryghost/admin-x-framework/routing';

import MemberEmailEditor from './member-email-editor';
import TestEmailDropdown from './test-email-dropdown';
import WelcomeEmailPreviewFrame from './welcome-email-preview-frame';
import {getWelcomeEmailValidationErrors} from './welcome-email-validation';
import {useWelcomeEmailPreview} from './use-welcome-email-preview';
import {useWelcomeEmailSenderDetails} from '../../../../hooks/use-welcome-email-sender-details';
import type {AutomatedEmail} from '@tryghost/admin-x-framework/api/automated-emails';

interface EmailPreviewModalContentProps {
    title: string;
    centeredHeaderContent?: React.ReactNode;
    headerActions?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    isEditMode?: boolean;
    onKeyDownCapture?: React.KeyboardEventHandler<HTMLDivElement>;
}

const EmailPreviewModalContent = React.forwardRef<
    HTMLDivElement,
    EmailPreviewModalContentProps
>(({title, centeredHeaderContent, headerActions, children, className, isEditMode = false, onKeyDownCapture}, ref) => (
    <div
        ref={ref}
        className={cn(
            'flex h-full w-full flex-col gap-0 overflow-hidden rounded-xl p-0',
            isEditMode ? 'bg-white' : 'bg-gray-100',
            'dark:bg-gray-975',
            className
        )}
        onKeyDownCapture={onKeyDownCapture}
    >
        <div className="sticky top-0 grid shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-gray-200 bg-white px-5 py-3 dark:border-gray-900 dark:bg-gray-975">
            <h3 className="justify-self-start text-xl font-semibold">
                {title}
            </h3>
            <div className="justify-self-center">
                {centeredHeaderContent}
            </div>
            <div className="flex items-center gap-2 justify-self-end">
                {headerActions}
            </div>
        </div>
        <div className="flex h-[clamp(0px,calc(100dvh-320px),82vh)] min-h-0 grow flex-col overflow-y-auto [scrollbar-gutter:stable]">
            {children}
        </div>
    </div>
));
EmailPreviewModalContent.displayName = 'EmailPreviewModalContent';

interface EmailPreviewEmailHeaderProps {
    children: React.ReactNode;
    className?: string;
}

const EmailPreviewEmailHeader: React.FC<EmailPreviewEmailHeaderProps> = ({children, className}) => (
    <div className={cn(
        'relative z-20 isolate mx-auto w-full max-w-[780px] rounded-t-lg border border-b-0 border-gray-200 bg-white px-6 py-4 transition-[max-width,padding] duration-300 ease-out motion-reduce:transition-none dark:border-grey-900 dark:bg-grey-975',
        className
    )}>
        {children}
    </div>
);

interface EmailPreviewBodyProps {
    children: React.ReactNode;
    className?: string;
}

const EmailPreviewBody: React.FC<EmailPreviewBodyProps> = ({children, className}) => (
    <div className={cn(
        'flex mx-auto w-full rounded-b-lg transition-[max-width,height,padding] duration-300 ease-out motion-reduce:transition-none dark:border-grey-900 dark:shadow-none grow max-w-[780px]',
        className
    )}>
        {children}
    </div>
);

interface WelcomeEmailModalProps {
    emailType: 'free' | 'paid';
    automatedEmail: AutomatedEmail;
}

type PreviewMode = 'edit' | 'preview';

type LexicalEditorInstance = KoenigInstance['editorInstance'] & {
    update: (callback: () => void, options?: {tag?: string}) => void;
};

const WelcomeEmailModal = NiceModal.create<WelcomeEmailModalProps>(({emailType = 'free', automatedEmail}) => {
    const modal = useModal();
    const {updateRoute} = useRouting();
    const {mutateAsync: editAutomatedEmail} = useEditAutomatedEmail();
    const {mutateAsync: previewWelcomeEmail} = usePreviewWelcomeEmail();
    const {data: automatedEmailsData} = useBrowseAutomatedEmails();
    const [showTestDropdown, setShowTestDropdown] = useState(false);
    const [mode, setMode] = useState<PreviewMode>('edit');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const normalizedLexical = useRef<string>(automatedEmail?.lexical || '');
    const hasUserInteractedWithEditor = useRef(false);
    const editorAPIRef = useRef<KoenigInstance | null>(null);
    const subjectInputRef = useRef<HTMLInputElement>(null);
    const lastSubjectSelectionRef = useRef({start: 0, end: 0});
    const bodyExitIntentRef = useRef<'arrow-up' | 'shift-tab' | null>(null);
    const handleError = useHandleError();
    const automatedEmails = automatedEmailsData?.automated_emails || [];
    const {resolvedSenderName, resolvedSenderEmail, resolvedReplyToEmail, hasDistinctReplyTo} = useWelcomeEmailSenderDetails(automatedEmails);
    const emailTypeLabel = emailType === 'paid' ? 'Paid' : 'Free';
    const modalTitle = `${emailTypeLabel} members welcome email`;

    const {formState, saveState, updateForm, setFormState, setErrors, handleSave, okProps, errors, validate} = useForm({
        initialState: {
            subject: automatedEmail?.subject || 'Welcome',
            lexical: automatedEmail?.lexical || ''
        },
        savingDelay: 500,
        onSave: async (state) => {
            await editAutomatedEmail({...automatedEmail, ...state});
        },
        onSaveError: handleError,
        onValidate: getWelcomeEmailValidationErrors
    });
    const saveButtonLabel = okProps.label || 'Save';
    const {previewFrameState, previewState, enterPreview, exitPreview} = useWelcomeEmailPreview({
        automatedEmailId: automatedEmail.id,
        previewWelcomeEmail,
        setErrors
    });

    const isDirty = saveState === 'unsaved';

    const handleClose = useCallback(() => {
        confirmIfDirty(isDirty, () => {
            modal.remove();
            updateRoute('memberemails');
        });
    }, [modal, isDirty, updateRoute]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowTestDropdown(false);
            }
        };

        if (showTestDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showTestDropdown]);

    const handleSaveRef = useRef(handleSave);
    useEffect(() => {
        handleSaveRef.current = handleSave;
    }, [handleSave]);

    useEffect(() => {
        const handleCMDS = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                handleSaveRef.current({fakeWhenUnchanged: true});
            }
        };
        window.addEventListener('keydown', handleCMDS);
        return () => {
            window.removeEventListener('keydown', handleCMDS);
        };
    }, []);

    const handleModeChange = useCallback((nextMode: PreviewMode) => {
        setMode(nextMode);

        if (nextMode === 'preview') {
            enterPreview(formState);
        } else {
            setShowTestDropdown(false);
            exitPreview();
        }
    }, [enterPreview, exitPreview, formState]);

    // The editor normalizes content on mount (e.g., processing {name} templates),
    // which triggers onChange even without user edits. Only mark the editor dirty
    // once the user has actually interacted with it, otherwise treat onChange as
    // normalization and update the clean baseline.
    const handleEditorChange = useCallback((lexical: string) => {
        if (!hasUserInteractedWithEditor.current) {
            normalizedLexical.current = lexical;
            setFormState(state => ({...state, lexical}));
            return;
        }

        if (lexical !== normalizedLexical.current) {
            updateForm(state => ({...state, lexical}));
        } else {
            setFormState(state => ({...state, lexical}));
        }
    }, [setFormState, updateForm]);

    const updateStoredSubjectSelection = useCallback((input = subjectInputRef.current) => {
        if (!input) {
            return;
        }

        const start = input.selectionStart ?? 0;
        const end = input.selectionEnd ?? start;

        lastSubjectSelectionRef.current = {start, end};
    }, []);

    const focusSubjectInput = useCallback((position: 'start' | 'stored') => {
        const input = subjectInputRef.current;

        if (!input) {
            return;
        }

        input.focus();

        requestAnimationFrame(() => {
            const selection = position === 'start'
                ? {start: 0, end: 0}
                : lastSubjectSelectionRef.current;

            input.setSelectionRange(selection.start, selection.end);
            updateStoredSubjectSelection(input);
        });
    }, [updateStoredSubjectSelection]);

    const focusEditorAtTop = useCallback(() => {
        const editorAPI = editorAPIRef.current;

        if (!editorAPI) {
            return;
        }

        requestAnimationFrame(() => {
            const lexicalEditor = editorAPI.editorInstance as LexicalEditorInstance;

            editorAPI.focusEditor({position: 'top'});

            lexicalEditor.update(() => {
                const firstChild = $getRoot().getFirstChild();
                const selectDecoratorNode = window['@tryghost/koenig-lexical']?.$selectDecoratorNode as
                    | ((node: object) => void)
                    | undefined;

                if (!firstChild) {
                    return;
                }

                if ($isDecoratorNode(firstChild) && selectDecoratorNode) {
                    selectDecoratorNode(firstChild);
                    lexicalEditor.getRootElement()?.focus();
                    return;
                }

                firstChild.selectStart?.();
            }, {tag: 'history-merge'});

            requestAnimationFrame(() => {
                const rootElement = lexicalEditor.getRootElement();

                if (!rootElement) {
                    return;
                }

                const textWalker = document.createTreeWalker(rootElement, NodeFilter.SHOW_TEXT, {
                    acceptNode: (node) => {
                        return node.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
                    }
                });
                const firstTextNode = textWalker.nextNode();

                if (!firstTextNode) {
                    return;
                }

                const selection = window.getSelection();
                const range = document.createRange();

                range.setStart(firstTextNode, 0);
                range.collapse(true);
                selection?.removeAllRanges();
                selection?.addRange(range);
                rootElement.focus();
            });
        });
    }, []);

    const insertParagraphAtTop = useCallback(() => {
        const editorAPI = editorAPIRef.current;

        if (!editorAPI) {
            return;
        }

        requestAnimationFrame(() => {
            editorAPI.insertParagraphAtTop({focus: true});

            requestAnimationFrame(() => {
                const rootElement = editorAPI.editorInstance.getRootElement();
                const firstParagraph = rootElement?.querySelector(':scope > p');

                if (!rootElement || !firstParagraph) {
                    rootElement?.focus();
                    return;
                }

                const selection = window.getSelection();
                const range = document.createRange();

                range.setStart(firstParagraph, 0);
                range.collapse(true);
                selection?.removeAllRanges();
                selection?.addRange(range);
                rootElement.focus();
            });
        });
    }, []);

    const handleSubjectKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
        const editorAPI = editorAPIRef.current;

        if (!editorAPI || event.nativeEvent.isComposing) {
            return;
        }

        const input = event.currentTarget;
        const valueLength = input.value.length;
        const selectionStart = input.selectionStart ?? 0;
        const selectionEnd = input.selectionEnd ?? selectionStart;
        const isCaretAtEnd = selectionStart === valueLength && selectionEnd === valueLength;

        if (event.key === 'Tab') {
            event.preventDefault();
            updateStoredSubjectSelection(input);
            focusEditorAtTop();
            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            updateStoredSubjectSelection(input);

            if (!editorAPI.editorIsEmpty()) {
                insertParagraphAtTop();
            } else {
                focusEditorAtTop();
            }

            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();

            if (valueLength === 0 || isCaretAtEnd) {
                updateStoredSubjectSelection(input);
                focusEditorAtTop();
                return;
            }

            input.setSelectionRange(valueLength, valueLength);
            updateStoredSubjectSelection(input);
        }
    }, [focusEditorAtTop, insertParagraphAtTop, updateStoredSubjectSelection]);

    const trackEditorExitIntent = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
        const target = event.target as HTMLElement;

        if (!target.closest('[data-kg="editor"]')) {
            return;
        }

        if (!['ArrowDown', 'ArrowUp', 'Tab'].includes(event.key)) {
            hasUserInteractedWithEditor.current = true;
        }

        if (event.key === 'Tab' && event.shiftKey) {
            bodyExitIntentRef.current = 'shift-tab';
            return;
        }

        if (event.key === 'ArrowUp' && !event.shiftKey) {
            bodyExitIntentRef.current = 'arrow-up';
            return;
        }

        bodyExitIntentRef.current = null;
    }, []);

    const handleBodyExitAtTop = useCallback(() => {
        const exitIntent = bodyExitIntentRef.current;
        bodyExitIntentRef.current = null;

        if (exitIntent === 'arrow-up') {
            focusSubjectInput('start');
            return;
        }

        focusSubjectInput('stored');
    }, [focusSubjectInput]);

    const handleModalKeyDownCapture = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== 'Escape') {
            return;
        }

        if (showTestDropdown) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        handleClose();
    }, [handleClose, showTestDropdown]);

    const previewSubject = previewState.status === 'success' ? previewState.preview.subject : formState.subject;

    return (
        <Modal
            afterClose={() => {
                updateRoute('memberemails');
            }}
            backDropClick={false}
            dirty={isDirty}
            footer={false}
            header={false}
            padding={false}
            scrolling={false}
            size='full'
            testId='welcome-email-modal'
            width='full'
        >
            <EmailPreviewModalContent
                centeredHeaderContent={
                    <Tabs
                        data-testid='welcome-email-mode-toggle'
                        value={mode}
                        variant='segmented-sm'
                        onValueChange={value => value && handleModeChange(value as PreviewMode)}
                    >
                        <TabsList className='grid w-[240px] grid-cols-2 bg-gray-100 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]'>
                            <TabsTrigger className='w-full justify-center data-[state=active]:bg-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black' data-testid='welcome-email-mode-edit' value='edit'>Email content</TabsTrigger>
                            <TabsTrigger className='w-full justify-center' data-testid='welcome-email-mode-preview' value='preview'>Preview</TabsTrigger>
                        </TabsList>
                    </Tabs>
                }
                className='dark:bg-[#151719]'
                headerActions={
                    <>
                        <Button variant="outline" onClick={handleClose}>Close</Button>
                        <Button
                            disabled={okProps.disabled}
                            onClick={async () => await handleSave({fakeWhenUnchanged: true})}
                        >
                            {saveButtonLabel}
                        </Button>
                    </>
                }
                isEditMode={mode === 'edit'}
                title={modalTitle}
                onKeyDownCapture={handleModalKeyDownCapture}
            >
                <div className='flex grow flex-col items-center p-6'>
                    {mode === 'edit' && (
                        <EmailPreviewEmailHeader className='max-w-[600px] border-0 bg-transparent px-0 py-0 shadow-none'>
                            <TextField
                                autoFocus={true}
                                className='w-full appearance-none border-0 bg-transparent px-0 pb-1 text-[1.75rem] leading-[1.1] font-bold tracking-[-0.017em] text-black shadow-none outline-none placeholder:font-bold placeholder:text-gray-400 focus:outline-none min-[500px]:text-[2.25rem] min-[769px]:text-[3rem] dark:text-white dark:placeholder:text-gray-600'
                                containerClassName='w-full'
                                data-testid='welcome-email-edit-subject'
                                error={Boolean(errors.subject)}
                                hint={errors.subject}
                                hintClassName='mt-2 text-sm'
                                inputRef={subjectInputRef}
                                placeholder='Email subject'
                                unstyled={true}
                                value={formState.subject}
                                onBlur={() => updateStoredSubjectSelection()}
                                onChange={(e) => {
                                    updateStoredSubjectSelection(e.target);
                                    updateForm(state => ({...state, subject: e.target.value}));
                                }}
                                onClick={() => updateStoredSubjectSelection()}
                                onFocus={() => updateStoredSubjectSelection()}
                                onKeyDown={handleSubjectKeyDown}
                                onKeyUp={() => updateStoredSubjectSelection()}
                                onSelect={() => updateStoredSubjectSelection()}
                            />
                        </EmailPreviewEmailHeader>
                    )}
                    {mode === 'preview' && (
                        <EmailPreviewEmailHeader className='border-x-0 border-t-0 border-b'>
                            <div className='flex flex-col gap-2'>
                                <div className='flex items-center py-1'>
                                    <div className='w-20 shrink-0 text-sm font-semibold'>From:</div>
                                    <div className='min-w-0 grow pr-4 text-sm'>
                                        <span className='flex gap-1 truncate whitespace-nowrap'>
                                            <span>{resolvedSenderName}</span>
                                            <span className='text-gray-500 dark:text-gray-400'>{`<${resolvedSenderEmail}>`}</span>
                                        </span>
                                    </div>
                                    <div ref={dropdownRef} className='relative'>
                                        <LegacyButton
                                            className='border border-grey-200 font-semibold hover:border-grey-300 hover:bg-white! dark:border-grey-900 dark:hover:border-grey-800 dark:hover:bg-grey-950!'
                                            color="clear"
                                            icon='send'
                                            label="Test"
                                            onClick={() => setShowTestDropdown(!showTestDropdown)}
                                        />
                                        {showTestDropdown && (
                                            <TestEmailDropdown automatedEmailId={automatedEmail.id} lexical={formState.lexical} subject={formState.subject} validateForm={validate} onClose={() => setShowTestDropdown(false)} />
                                        )}
                                    </div>
                                </div>
                                {hasDistinctReplyTo && (
                                    <div className='flex items-center'>
                                        <div className='w-20 shrink-0 text-sm font-semibold'>Reply-to:</div>
                                        <div className='grow text-sm text-gray-500 dark:text-gray-400'>
                                            {resolvedReplyToEmail}
                                        </div>
                                    </div>
                                )}
                                <div className='flex items-center'>
                                    <div className='w-20 shrink-0 text-sm font-semibold'>Subject:</div>
                                    <div className='grow'>
                                        <div
                                            className='w-full text-sm text-black dark:text-white'
                                            data-testid='welcome-email-preview-subject'
                                        >
                                            {previewSubject}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </EmailPreviewEmailHeader>
                    )}
                    <EmailPreviewBody className={cn(
                        mode === 'preview' && 'shadow-sm bg-white dark:bg-grey-975',
                        mode === 'edit' && 'px-6',
                        mode === 'edit' && 'rounded-lg',
                        mode === 'edit' && errors.lexical && 'border border-red-500'
                    )}>
                        <div
                            className={cn(
                                'mx-auto w-full max-w-[600px] pt-10 pb-8 transition-[max-width,padding] duration-300 ease-out motion-reduce:transition-none',
                                mode === 'preview' && 'hidden'
                            )}
                            data-testid='welcome-email-editor'
                            onKeyDownCapture={trackEditorExitIntent}
                            onMouseDownCapture={(event) => {
                                const target = event.target as HTMLElement;

                                if (target.closest('[data-kg="editor"]')) {
                                    hasUserInteractedWithEditor.current = true;
                                }
                            }}
                        >
                            <MemberEmailEditor
                                key={automatedEmail?.id || 'new'}
                                className='welcome-email-editor'
                                cursorDidExitAtTop={handleBodyExitAtTop}
                                placeholder='Write your welcome email content...'
                                registerAPI={(API) => {
                                    editorAPIRef.current = API;
                                }}
                                value={formState.lexical}
                                onChange={handleEditorChange}
                            />
                        </div>
                        {mode === 'preview' && (
                            <WelcomeEmailPreviewFrame previewState={previewFrameState} />
                        )}
                    </EmailPreviewBody>
                    {mode === 'edit' && errors.lexical && <Hint className='mt-2 max-w-[740px]' color='red'>{errors.lexical}</Hint>}
                </div>
            </EmailPreviewModalContent>
        </Modal>
    );
});

export default WelcomeEmailModal;
