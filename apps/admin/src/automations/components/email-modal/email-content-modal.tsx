import EmailEditor from './email-editor';
import EmailPreviewFrame from './preview-frame';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import TestEmailDropdown from './test-email-dropdown';
import {AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Button, Dialog, DialogContent, DialogTitle, Input, Tabs, TabsList, TabsTrigger} from '@tryghost/shade/components';
import {LucideIcon, cn} from '@tryghost/shade/utils';
import {getEmailValidationErrors} from './validation';
import {useBrowseAutomatedEmails} from '@tryghost/admin-x-framework/api/automated-emails';
import {useEmailPreview} from './use-email-preview';
import {useEmailSenderDetails} from './use-sender-details';
import {useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';
import {usePreviewAutomationEmail} from '@tryghost/admin-x-framework/api/automations';
import type {EmailModalMode} from '@/automations/components/types';

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
            'flex size-full flex-col gap-0 overflow-hidden p-0',
            isEditMode ? 'bg-white' : 'bg-gray-100',
            'dark:bg-[#151719]',
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
        'relative isolate z-20 mx-auto w-full max-w-[780px] rounded-t-lg border border-b-0 border-gray-200 bg-white px-6 py-4 transition-[max-width,padding] duration-300 ease-out motion-reduce:transition-none dark:border-grey-900 dark:bg-[#2E3338]',
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
        'mx-auto flex w-full max-w-[780px] grow rounded-b-lg transition-[max-width,height,padding] duration-300 ease-out motion-reduce:transition-none dark:border-grey-900 dark:shadow-none',
        className
    )}>
        {children}
    </div>
);

export interface EmailContentModalProps {
    automationId: string;
    initialLexical: string;
    initialMode?: EmailModalMode;
    initialSubject: string;
    isDiscardNavigationBlocked?: boolean;
    onClose: () => void;
    onDirtyChange?: (isDirty: boolean) => void;
    onDiscardBlockedNavigation?: () => void;
    onKeepEditingAfterBlockedNavigation?: () => void;
    onSave: (data: {subject: string; lexical: string}) => void;
}

// Koenig popups (link input, emoji picker, card settings) handle Escape
// themselves — the dialog shouldn't also act on it.
const isKoenigPortalFocused = () => {
    const activeElement = document.activeElement;
    return activeElement instanceof HTMLElement && activeElement.closest('[data-kg-portal]') !== null;
};

const EmailContentModal: React.FC<EmailContentModalProps> = ({
    automationId,
    initialMode = 'edit',
    initialSubject,
    initialLexical,
    isDiscardNavigationBlocked = false,
    onClose,
    onDirtyChange,
    onDiscardBlockedNavigation,
    onKeepEditingAfterBlockedNavigation,
    onSave
}) => {
    const {mutateAsync: previewAutomationEmail} = usePreviewAutomationEmail();
    const {data: automatedEmailsData} = useBrowseAutomatedEmails();
    const [showTestDropdown, setShowTestDropdown] = useState(false);
    const [mode, setMode] = useState<EmailModalMode>(initialMode);
    const [previewSubjectOverride, setPreviewSubjectOverride] = useState<string | null>(null);
    const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
    const hasEnteredInitialPreview = useRef(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const normalizedLexical = useRef<string>(initialLexical || '');
    const hasEditorBeenFocused = useRef(false);
    const allowDirtyCloseRef = useRef(false);
    const handleError = useHandleError();
    const automatedEmails = automatedEmailsData?.automated_emails || [];
    const {resolvedSenderName, resolvedSenderEmail, resolvedReplyToEmail, hasDistinctReplyTo} = useEmailSenderDetails(automatedEmails);

    // Saving commits whatever the user has — including an empty subject or body — to the
    // automation draft. Completeness is only enforced when publishing the automation or
    // sending a test email (see validateForTest below), not when saving a draft.
    const {formState, saveState, updateForm, setFormState, setErrors, handleSave, okProps, errors, clearError} = useForm({
        initialState: {
            subject: initialSubject || '',
            lexical: initialLexical || ''
        },
        savingDelay: 500,
        onSave: (state) => {
            onSave({subject: state.subject, lexical: state.lexical});
        },
        onSaveError: handleError
    });

    const validateForTest = useCallback((): boolean => {
        const newErrors = getEmailValidationErrors(formState);
        setErrors(newErrors);
        return Object.values(newErrors).every(error => !error);
    }, [formState, setErrors]);
    const saveButtonLabel = okProps.label || 'Save';
    const {previewFrameState, enterPreview, exitPreview} = useEmailPreview({
        automationId,
        previewAutomationEmail,
        setErrors
    });

    useEffect(() => {
        if (initialMode !== 'preview' || hasEnteredInitialPreview.current) {
            return;
        }
        hasEnteredInitialPreview.current = true;
        void enterPreview(formState);
    }, [enterPreview, formState, initialMode]);

    const isDirty = saveState === 'unsaved';

    useEffect(() => {
        onDirtyChange?.(isDirty && !allowDirtyCloseRef.current);
        return () => {
            onDirtyChange?.(false);
        };
    }, [isDirty, onDirtyChange]);

    // Single close funnel: Esc, overlay click, and the Close button all route here.
    const attemptClose = useCallback(() => {
        if (isDirty) {
            setConfirmDiscardOpen(true);
        } else {
            onClose();
        }
    }, [isDirty, onClose]);

    // Commit to the automation draft. The Close button is the only way out of the modal.
    const handleSaveClick = useCallback(async () => {
        await handleSave({fakeWhenUnchanged: true});
    }, [handleSave]);

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

    const handleSaveClickRef = useRef(handleSaveClick);
    useEffect(() => {
        handleSaveClickRef.current = handleSaveClick;
    }, [handleSaveClick]);

    useEffect(() => {
        const handleCMDS = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                void handleSaveClickRef.current();
            }
        };
        window.addEventListener('keydown', handleCMDS);
        return () => {
            window.removeEventListener('keydown', handleCMDS);
        };
    }, []);

    const [dialogContentNode, setDialogContentNode] = useState<HTMLDivElement | null>(null);

    // The dialog is non-modal so Radix's focus trap can't fight Koenig's
    // body-level portals (link input, toolbar, emoji picker), which means
    // nothing stops focus from reaching the admin UI behind the editor. Make
    // everything else at body level inert while the editor is open —
    // unfocusable, unclickable, and hidden from screen readers. Koenig
    // portals and stacked dialogs mount after this runs, so they stay
    // interactive.
    useEffect(() => {
        const dialogPortalWrapper = dialogContentNode?.closest('body > *');
        if (!dialogPortalWrapper) {
            return;
        }

        const madeInert: HTMLElement[] = [];
        for (const el of document.body.children) {
            if (el !== dialogPortalWrapper && el instanceof HTMLElement && !el.inert) {
                el.inert = true;
                madeInert.push(el);
            }
        }

        return () => {
            madeInert.forEach((el) => {
                el.inert = false;
            });
        };
    }, [dialogContentNode]);

    const handleModeChange = useCallback((nextMode: EmailModalMode) => {
        setMode(nextMode);

        if (nextMode === 'preview') {
            setPreviewSubjectOverride(null);
            void enterPreview(formState);
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
            <Dialog modal={false} open onOpenChange={(next) => {
                if (!next) {
                    attemptClose();
                }
            }}>
                <DialogContent
                    ref={setDialogContentNode}
                    aria-describedby={undefined}
                    className='top-0 left-0 h-[100dvh] w-full max-w-full translate-0 grid-rows-[1fr] gap-0 rounded-none border-0 p-0 shadow-none outline-hidden sm:rounded-none dark:bg-[#151719]'
                    onEscapeKeyDown={(event) => {
                        if (isKoenigPortalFocused()) {
                            // prevent Radix dismissing the dialog but let the
                            // event through so Koenig can close its popup
                            event.preventDefault();
                            return;
                        }

                        event.preventDefault();
                        event.stopPropagation();
                        attemptClose();
                    }}
                    onInteractOutside={(event) => {
                        // never auto-dismiss on pointer/focus outside — this is a
                        // full-screen editor whose only exits are the Close button
                        // and Escape. Without this, a non-modal dialog dismisses
                        // when Tab lands focus on anything outside it (e.g. Radix's
                        // focus-guard spans), which re-triggers attemptClose
                        event.preventDefault();
                    }}
                >
                    <DialogTitle className='sr-only'>Edit email</DialogTitle>
                    <EmailPreviewModalContent
                        centeredHeaderContent={
                            <Tabs
                                data-testid='email-mode-toggle'
                                value={mode}
                                variant='segmented-sm'
                                onValueChange={value => value && handleModeChange(value as EmailModalMode)}
                            >
                                <TabsList className='grid w-[240px] grid-cols-2 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]'>
                                    <TabsTrigger className='w-full justify-center' data-testid='email-mode-edit' value='edit'>Email content</TabsTrigger>
                                    <TabsTrigger className='w-full justify-center' data-testid='email-mode-preview' value='preview'>Preview</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        }
                        headerActions={
                            <>
                                <Button variant="outline" onClick={attemptClose}>Close</Button>
                                <Button
                                    disabled={okProps.disabled}
                                    onClick={() => void handleSaveClick()}
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
                                                    <TestEmailDropdown automationId={automationId} lexical={formState.lexical} subject={formState.subject} validateForm={validateForTest} onClose={() => setShowTestDropdown(false)} />
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
                                                        clearError('subject');
                                                    }}
                                                />
                                                {errors.subject && <span className='mt-2 block text-xs text-destructive'>{errors.subject}</span>}
                                            </div>
                                        </div>
                                    </div>
                                </EmailPreviewEmailHeader>
                            )}
                            <EmailPreviewBody className={cn(
                                mode === 'preview' && 'bg-white shadow-sm dark:bg-[#151719]',
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
                                        placeholder='Begin writing your email...'
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
            <AlertDialog
                open={confirmDiscardOpen || isDiscardNavigationBlocked}
                onOpenChange={(open) => {
                    if (open) {
                        setConfirmDiscardOpen(true);
                        return;
                    }

                    setConfirmDiscardOpen(false);
                    if (isDiscardNavigationBlocked) {
                        onKeepEditingAfterBlockedNavigation?.();
                    }
                }}
            >
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
                                if (isDiscardNavigationBlocked) {
                                    onDiscardBlockedNavigation?.();
                                    return;
                                }

                                allowDirtyCloseRef.current = true;
                                onDirtyChange?.(false);
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
