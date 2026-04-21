import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React from 'react';
import {useCallback, useEffect, useRef, useState} from 'react';

import MemberEmailEditor from './member-email-editor';
import WelcomeEmailPreviewFrame from './welcome-email-preview-frame';
import {Hint, Button as LegacyButton, Modal, TextField} from '@tryghost/admin-x-design-system';
import {confirmIfDirty} from '@tryghost/admin-x-design-system';
import {getWelcomeEmailValidationErrors} from './welcome-email-validation';
import {useBrowseAutomatedEmails, useEditAutomatedEmail, usePreviewWelcomeEmail} from '@tryghost/admin-x-framework/api/automated-emails';
import {useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import {useWelcomeEmailPreview} from './use-welcome-email-preview';
import {useWelcomeEmailSenderDetails} from '../../../../hooks/use-welcome-email-sender-details';

import TestEmailDropdown from './test-email-dropdown';
import type {AutomatedEmail} from '@tryghost/admin-x-framework/api/automated-emails';

import {Button, Tabs, TabsList, TabsTrigger} from '@tryghost/shade/components';
import {cn} from '@tryghost/shade/utils';

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
            'flex h-full w-full flex-col gap-0 overflow-hidden rounded-xl p-0',
            isEditMode ? 'bg-white' : 'bg-gray-100',
            'dark:bg-gray-975',
            className
        )}
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

const WelcomeEmailModal = NiceModal.create<WelcomeEmailModalProps>(({emailType = 'free', automatedEmail}) => {
    const modal = useModal();
    const {updateRoute} = useRouting();
    const {mutateAsync: editAutomatedEmail} = useEditAutomatedEmail();
    const {mutateAsync: previewWelcomeEmail} = usePreviewWelcomeEmail();
    const {data: automatedEmailsData} = useBrowseAutomatedEmails();
    const [showTestDropdown, setShowTestDropdown] = useState(false);
    const [mode, setMode] = useState<PreviewMode>('edit');
    const [previewSubjectOverride, setPreviewSubjectOverride] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const normalizedLexical = useRef<string>(automatedEmail?.lexical || '');
    const hasEditorBeenFocused = useRef(false);
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
    const {previewFrameState, enterPreview, exitPreview} = useWelcomeEmailPreview({
        automatedEmailId: automatedEmail.id,
        previewWelcomeEmail,
        setErrors
    });

    const isDirty = saveState === 'unsaved';

    const handleClose = useCallback(() => {
        confirmIfDirty(isDirty, () => {
            modal.remove();
        });
    }, [modal, isDirty]);

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
                                        <TextField
                                            className='w-full'
                                            data-testid='welcome-email-preview-subject'
                                            value={previewSubjectOverride ?? formState.subject}
                                            onChange={(e) => {
                                                const nextSubject = e.target.value;
                                                setPreviewSubjectOverride(nextSubject);
                                                updateForm(state => ({...state, subject: nextSubject}));
                                            }}
                                        />
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
                            onFocus={() => {
                                hasEditorBeenFocused.current = true;
                            }}
                        >
                            <MemberEmailEditor
                                key={automatedEmail?.id || 'new'}
                                className='welcome-email-editor'
                                placeholder='Write your welcome email content...'
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
