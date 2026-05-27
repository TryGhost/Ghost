import EmailEditor from './email-editor';
import EmailPreviewFrame from './preview-frame';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import TestEmailDropdown from './test-email-dropdown';
import {AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Button, Dialog, DialogContent, DialogTitle, Input, Tabs, TabsList, TabsTrigger} from '@tryghost/shade/components';
import {LucideIcon, cn} from '@tryghost/shade/utils';
import {WELCOME_EMAIL_SLUGS} from './sender-details';
import {getEmailValidationErrors} from './validation';
import {useBrowseAutomatedEmails, usePreviewWelcomeEmail} from '@tryghost/admin-x-framework/api/automated-emails';
import {useEmailPreview} from './use-email-preview';
import {useEmailSenderDetails} from './use-sender-details';
import {useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';

interface EmailPreviewModalContentProps {
    title: string;
    centeredHeaderContent?: React.ReactNode;
    headerActions?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    isEditMode?: boolean;
}

const EmailPreviewModalContent = React.forwardRef<
    HTMLDivElement,
    EmailPreviewModalContentProps
>(({title, centeredHeaderContent, headerActions, children, className, isEditMode = false}, ref) => (
    <div
        ref={ref}
        className={cn(
            'flex h-full w-full flex-col gap-0 overflow-hidden p-0',
            isEditMode ? 'bg-white' : 'bg-gray-100',
            'dark:bg-gray-975',
            className
        )}
    >
        <div className="sticky top-0 grid shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-gray-200 bg-white px-5 py-3 dark:border-gray-900 dark:bg-gray-950">
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
        <div className="flex min-h-0 grow flex-col overflow-y-auto [scrollbar-gutter:stable]">
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

export interface EmailContentModalProps {
    initialSubject: string;
    initialLexical: string;
    onClose: () => void;
    onSave: (data: {subject: string; lexical: string}) => void;
}

type PreviewMode = 'edit' | 'preview';

const EmailContentModal: React.FC<EmailContentModalProps> = ({initialSubject, initialLexical, onClose, onSave}) => {
    const {mutateAsync: previewWelcomeEmail} = usePreviewWelcomeEmail();
    const {data: automatedEmailsData} = useBrowseAutomatedEmails();
    const [showTestDropdown, setShowTestDropdown] = useState(false);
    const [mode, setMode] = useState<PreviewMode>('edit');
    const [previewSubjectOverride, setPreviewSubjectOverride] = useState<string | null>(null);
    const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const normalizedLexical = useRef<string>(initialLexical || '');
    const hasEditorBeenFocused = useRef(false);
    const handleError = useHandleError();
    const automatedEmails = automatedEmailsData?.automated_emails || [];
    const {resolvedSenderName, resolvedSenderEmail, resolvedReplyToEmail, hasDistinctReplyTo} = useEmailSenderDetails(automatedEmails);

    // Preview & test reuse the legacy welcome-email endpoints, which are keyed by
    // an automated-email id. Borrow the free welcome email's id (falling back to
    // the first record) so unsaved automation content can be rendered/sent.
    const previewAutomatedEmailId = (
        automatedEmails.find(email => email.slug === WELCOME_EMAIL_SLUGS.free)
        || automatedEmails[0]
    )?.id || '';

    const {formState, saveState, updateForm, setFormState, setErrors, handleSave, okProps, errors, validate} = useForm({
        initialState: {
            subject: initialSubject || '',
            lexical: initialLexical || ''
        },
        savingDelay: 500,
        onSave: async (state) => {
            onSave({subject: state.subject, lexical: state.lexical});
        },
        onSaveError: handleError,
        onValidate: getEmailValidationErrors
    });
    const saveButtonLabel = okProps.label || 'Save';
    const {previewFrameState, enterPreview, exitPreview} = useEmailPreview({
        automatedEmailId: previewAutomatedEmailId,
        previewWelcomeEmail,
        setErrors
    });

    const isDirty = saveState === 'unsaved';

    // Single close funnel: Esc, overlay click, and the Close button all route here.
    const attemptClose = useCallback(() => {
        if (isDirty) {
            setConfirmDiscardOpen(true);
        } else {
            onClose();
        }
    }, [isDirty, onClose]);

    // Commit to the automation draft, then close the modal.
    const handleSaveAndClose = useCallback(async () => {
        const result = await handleSave({fakeWhenUnchanged: true});
        if (result) {
            onClose();
        }
    }, [handleSave, onClose]);

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

    const handleSaveAndCloseRef = useRef(handleSaveAndClose);
    useEffect(() => {
        handleSaveAndCloseRef.current = handleSaveAndClose;
    }, [handleSaveAndClose]);

    useEffect(() => {
        const handleCMDS = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                handleSaveAndCloseRef.current();
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
            setPreviewSubjectOverride(null);
            enterPreview(formState);
        } else {
            setShowTestDropdown(false);
            setPreviewSubjectOverride(null);
            exitPreview();
        }
    }, [enterPreview, exitPreview, formState]);

    // The editor normalizes content on mount (e.g., processing {name} templates),
    // which triggers onChange even without user edits. We track whether the editor
    // has ever been focused - normalization happens before focus is possible, so any
    // onChange before first focus is normalization. After focus, we compare against
    // the normalized baseline to determine dirty state.
    const handleEditorChange = useCallback((lexical: string) => {
        if (!hasEditorBeenFocused.current) {
            // Editor hasn't been focused yet = must be normalization
            normalizedLexical.current = lexical;
            setFormState(state => ({...state, lexical}));
            return;
        }

        // Editor has been focused = compare to baseline
        if (lexical !== normalizedLexical.current) {
            updateForm(state => ({...state, lexical}));
        } else {
            // Content reverted to normalized state - don't mark dirty
            setFormState(state => ({...state, lexical}));
        }
    }, [setFormState, updateForm]);

    return (
        <>
            <Dialog open onOpenChange={(next) => {
                if (!next) {
                    attemptClose();
                }
            }}>
                <DialogContent
                    aria-describedby={undefined}
                    className='top-0 left-0 h-[100dvh] w-full max-w-full translate-x-0 translate-y-0 grid-rows-[1fr] gap-0 rounded-none border-0 p-0 shadow-none outline-hidden sm:rounded-none dark:bg-[#151719]'
                    onEscapeKeyDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        attemptClose();
                    }}
                >
                    <DialogTitle className='sr-only'>Edit email</DialogTitle>
                    <EmailPreviewModalContent
                        centeredHeaderContent={
                            <Tabs
                                data-testid='email-mode-toggle'
                                value={mode}
                                variant='segmented-sm'
                                onValueChange={value => value && handleModeChange(value as PreviewMode)}
                            >
                                <TabsList className='grid w-[240px] grid-cols-2 bg-gray-100 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]'>
                                    <TabsTrigger className='w-full justify-center data-[state=active]:bg-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black' data-testid='email-mode-edit' value='edit'>Email content</TabsTrigger>
                                    <TabsTrigger className='w-full justify-center' data-testid='email-mode-preview' value='preview'>Preview</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        }
                        headerActions={
                            <>
                                <Button variant="outline" onClick={attemptClose}>Close</Button>
                                <Button
                                    disabled={okProps.disabled}
                                    onClick={handleSaveAndClose}
                                >
                                    {saveButtonLabel}
                                </Button>
                            </>
                        }
                        isEditMode={mode === 'edit'}
                        title='Edit email'
                    >
                        <div className='flex grow flex-col items-center p-6'>
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
                                                <Button variant="outline" onClick={() => setShowTestDropdown(!showTestDropdown)}>
                                                    <LucideIcon.Send className='size-4' />
                                                    Test
                                                </Button>
                                                {showTestDropdown && (
                                                    <TestEmailDropdown automatedEmailId={previewAutomatedEmailId} lexical={formState.lexical} subject={formState.subject} validateForm={validate} onClose={() => setShowTestDropdown(false)} />
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
                                                <Input
                                                    className='w-full'
                                                    data-testid='email-preview-subject'
                                                    value={previewSubjectOverride ?? formState.subject}
                                                    onChange={(e) => {
                                                        const nextSubject = e.target.value;
                                                        setPreviewSubjectOverride(nextSubject);
                                                        updateForm(state => ({...state, subject: nextSubject}));
                                                    }}
                                                />
                                                {errors.subject && <span className='mt-2 block text-xs text-destructive'>{errors.subject}</span>}
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
                                    data-testid='email-editor'
                                    onFocus={() => {
                                        hasEditorBeenFocused.current = true;
                                    }}
                                >
                                    <EmailEditor
                                        className='automation-email-editor'
                                        placeholder='Write your email content...'
                                        value={formState.lexical}
                                        onChange={handleEditorChange}
                                    />
                                </div>
                                {mode === 'preview' && (
                                    <EmailPreviewFrame previewState={previewFrameState} />
                                )}
                            </EmailPreviewBody>
                            {mode === 'edit' && errors.lexical && <span className='mt-2 block max-w-[740px] text-xs text-destructive'>{errors.lexical}</span>}
                        </div>
                    </EmailPreviewModalContent>
                </DialogContent>
            </Dialog>
            <AlertDialog open={confirmDiscardOpen} onOpenChange={setConfirmDiscardOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Discard changes?</AlertDialogTitle>
                        <AlertDialogDescription>Your changes to this email haven&apos;t been saved.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep editing</AlertDialogCancel>
                        <Button
                            variant='destructive'
                            onClick={() => {
                                setConfirmDiscardOpen(false);
                                onClose();
                            }}
                        >
                            Discard
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default EmailContentModal;
