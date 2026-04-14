import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React from 'react';
import {useCallback, useEffect, useRef, useState} from 'react';

import MemberEmailEditor from './member-email-editor';
import {Hint, Button as LegacyButton, LoadingIndicator, Modal, TextField} from '@tryghost/admin-x-design-system';
import {confirmIfDirty} from '@tryghost/admin-x-design-system';
import {useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useWelcomeEmailSenderDetails} from '../../../../hooks/use-welcome-email-sender-details';

import TestEmailDropdown from './test-email-dropdown';
import {JSONError} from '@tryghost/admin-x-framework/errors';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useBrowseAutomatedEmails, useEditAutomatedEmail, usePreviewWelcomeEmail} from '@tryghost/admin-x-framework/api/automated-emails';
import {useGlobalData} from '../../../../components/providers/global-data-provider';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import type {AutomatedEmail, AutomatedEmailPreview} from '@tryghost/admin-x-framework/api/automated-emails';

import {Button, Tabs, TabsList, TabsTrigger} from '@tryghost/shade/components';
import {cn} from '@tryghost/shade/utils';

interface EmailPreviewModalContentProps {
    title: string;
    centeredHeaderContent?: React.ReactNode;
    headerActions?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}

const EmailPreviewModalContent = React.forwardRef<
    HTMLDivElement,
    EmailPreviewModalContentProps
>(({title, centeredHeaderContent, headerActions, children, className}, ref) => (
    <div
        ref={ref}
        className={cn(
            'flex h-full w-full flex-col gap-0 overflow-hidden rounded-xl bg-gray-100 p-0',
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
        'flex mx-auto w-full rounded-b-lg bg-white shadow-sm transition-[max-width,height,padding] duration-300 ease-out motion-reduce:transition-none dark:border-grey-900 dark:bg-grey-975 dark:shadow-none grow max-w-[780px] px-6',
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

type PreviewState = {
    status: 'idle' | 'loading' | 'success' | 'error' | 'invalid';
    preview?: AutomatedEmailPreview;
    message?: string;
};

const isEmptyLexical = (lexical: string | null | undefined): boolean => {
    if (!lexical) {
        return true;
    }

    try {
        const parsed = JSON.parse(lexical);
        const children = parsed?.root?.children;

        // Empty if no children or only an empty paragraph
        if (!children || children.length === 0) {
            return true;
        }
        if (children.length === 1 &&
            children[0].type === 'paragraph' &&
            (!children[0].children || children[0].children.length === 0)) {
            return true;
        }

        return false;
    } catch {
        return true;
    }
};

const getWelcomeEmailValidationErrors = (state: {subject: string; lexical: string}): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    if (!state.subject?.trim()) {
        newErrors.subject = 'A subject is required';
    }

    if (isEmptyLexical(state.lexical)) {
        newErrors.lexical = 'Email content is required';
    }

    return newErrors;
};

const getPreviewSignature = (subject: string, lexical: string) => `${subject}::${lexical}`;

const WelcomeEmailModal = NiceModal.create<WelcomeEmailModalProps>(({emailType = 'free', automatedEmail}) => {
    const modal = useModal();
    const {updateRoute} = useRouting();
    const {mutateAsync: editAutomatedEmail} = useEditAutomatedEmail();
    const {mutateAsync: previewWelcomeEmail} = usePreviewWelcomeEmail();
    const {data: automatedEmailsData} = useBrowseAutomatedEmails();
    const [showTestDropdown, setShowTestDropdown] = useState(false);
    const [mode, setMode] = useState<PreviewMode>('edit');
    const [previewState, setPreviewState] = useState<PreviewState>({status: 'idle'});
    const [previewHeight, setPreviewHeight] = useState<number | null>(null);
    const [isPreviewReady, setIsPreviewReady] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const previewIframeRef = useRef<HTMLIFrameElement>(null);
    const previewResizeObserverRef = useRef<ResizeObserver | null>(null);
    const previewMeasureFrameRef = useRef<number | null>(null);
    const previewRevealFrameRef = useRef<number | null>(null);
    const previewCacheRef = useRef<{signature: string; preview: AutomatedEmailPreview} | null>(null);
    const normalizedLexical = useRef<string>(automatedEmail?.lexical || '');
    const hasEditorBeenFocused = useRef(false);
    const handleError = useHandleError();
    const {settings} = useGlobalData();
    const [siteTitle] = getSettingValues<string>(settings, ['title']);
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

    useEffect(() => {
        if (mode !== 'edit') {
            return;
        }

        const currentSignature = getPreviewSignature(formState.subject, formState.lexical);
        if (previewCacheRef.current?.signature !== currentSignature) {
            previewCacheRef.current = null;
        }
    }, [mode, formState.subject, formState.lexical]);

    const cleanupPreviewMeasurement = useCallback(() => {
        previewResizeObserverRef.current?.disconnect();
        previewResizeObserverRef.current = null;

        if (previewMeasureFrameRef.current !== null) {
            window.cancelAnimationFrame(previewMeasureFrameRef.current);
            previewMeasureFrameRef.current = null;
        }

        if (previewRevealFrameRef.current !== null) {
            window.cancelAnimationFrame(previewRevealFrameRef.current);
            previewRevealFrameRef.current = null;
        }
    }, []);

    useEffect(() => {
        cleanupPreviewMeasurement();

        if (mode !== 'preview') {
            setIsPreviewReady(false);
            setPreviewHeight(null);
            return;
        }

        setIsPreviewReady(false);
        setPreviewHeight(null);
    }, [cleanupPreviewMeasurement, mode, previewState.preview?.html]);

    useEffect(() => cleanupPreviewMeasurement, [cleanupPreviewMeasurement]);

    const syncPreviewHeight = useCallback(() => {
        const iframe = previewIframeRef.current;
        const doc = iframe?.contentDocument;

        if (!iframe || !doc) {
            return;
        }

        doc.documentElement.style.overflowY = 'hidden';
        doc.body.style.overflowY = 'hidden';

        const nextHeight = Math.max(
            doc.documentElement?.scrollHeight || 0,
            doc.body?.scrollHeight || 0,
            doc.documentElement?.offsetHeight || 0,
            doc.body?.offsetHeight || 0
        );

        if (nextHeight > 0) {
            setPreviewHeight((previousHeight) => {
                return previousHeight === nextHeight ? previousHeight : nextHeight;
            });

            if (!isPreviewReady && previewRevealFrameRef.current === null) {
                previewRevealFrameRef.current = window.requestAnimationFrame(() => {
                    previewRevealFrameRef.current = window.requestAnimationFrame(() => {
                        previewRevealFrameRef.current = null;
                        setIsPreviewReady(true);
                    });
                });
            }
        }
    }, [isPreviewReady]);

    const queuePreviewHeightSync = useCallback(() => {
        if (previewMeasureFrameRef.current !== null) {
            window.cancelAnimationFrame(previewMeasureFrameRef.current);
        }

        previewMeasureFrameRef.current = window.requestAnimationFrame(() => {
            previewMeasureFrameRef.current = null;
            syncPreviewHeight();
        });
    }, [syncPreviewHeight]);

    const handlePreviewLoad = useCallback(() => {
        const iframe = previewIframeRef.current;
        const doc = iframe?.contentDocument;

        if (!iframe || !doc) {
            return;
        }

        cleanupPreviewMeasurement();
        queuePreviewHeightSync();

        if (typeof ResizeObserver !== 'undefined') {
            const observer = new ResizeObserver(() => {
                queuePreviewHeightSync();
            });

            observer.observe(doc.documentElement);
            observer.observe(doc.body);
            previewResizeObserverRef.current = observer;
        }
    }, [cleanupPreviewMeasurement, queuePreviewHeightSync]);

    const renderPreview = useCallback(async () => {
        const validationErrors = getWelcomeEmailValidationErrors(formState);
        setErrors(validationErrors);

        const hasValidationErrors = Boolean(validationErrors.subject || validationErrors.lexical);
        if (hasValidationErrors) {
            setPreviewState({
                status: 'invalid',
                message: validationErrors.subject || validationErrors.lexical
            });
            return;
        }

        const signature = getPreviewSignature(formState.subject, formState.lexical);
        if (previewCacheRef.current?.signature === signature) {
            setPreviewState({
                status: 'success',
                preview: previewCacheRef.current.preview
            });
            return;
        }

        setPreviewState({status: 'loading'});

        try {
            const response = await previewWelcomeEmail({
                id: automatedEmail.id,
                subject: formState.subject,
                lexical: formState.lexical
            });
            const preview = response.automated_emails?.[0];

            if (!preview?.html || !preview?.plaintext || !preview?.subject) {
                throw new Error('Preview response was incomplete');
            }

            previewCacheRef.current = {signature, preview};
            setPreviewState({
                status: 'success',
                preview
            });
        } catch (error) {
            let message = 'Failed to render preview';
            if (error instanceof JSONError && error.data?.errors?.[0]) {
                message = error.data.errors[0].context || error.data.errors[0].message || message;
            } else if (error instanceof Error && error.message) {
                message = error.message;
            }

            setPreviewState({
                status: 'error',
                message
            });
        }
    }, [automatedEmail.id, formState, previewWelcomeEmail, setErrors]);

    const handleModeChange = useCallback((nextMode: PreviewMode) => {
        setMode(nextMode);

        if (nextMode === 'preview') {
            void renderPreview();
        }
    }, [renderPreview]);

    const showPreviewLoading = mode === 'preview' &&
        (previewState.status === 'loading' || (previewState.status === 'success' && !isPreviewReady));

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
                        <TabsList className='bg-gray-100 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]'>
                            <TabsTrigger data-testid='welcome-email-mode-edit' value='edit'>Edit</TabsTrigger>
                            <TabsTrigger data-testid='welcome-email-mode-preview' value='preview'>Preview</TabsTrigger>
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
                title={modalTitle}
            >
                <div className='flex grow flex-col items-center p-6'>
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
                                    {mode === 'edit' ? (
                                        <TextField
                                            className='w-full'
                                            error={Boolean(errors.subject)}
                                            hint={errors.subject || ''}
                                            maxLength={300}
                                            placeholder={`Welcome to ${siteTitle}`}
                                            value={formState.subject}
                                            onChange={e => updateForm(state => ({...state, subject: e.target.value}))}
                                        />
                                    ) : (
                                        <TextField
                                            className='w-full cursor-default caret-transparent'
                                            data-testid='welcome-email-preview-subject'
                                            tabIndex={-1}
                                            value={previewState.preview?.subject || formState.subject}
                                            readOnly
                                            onFocus={e => e.currentTarget.blur()}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </EmailPreviewEmailHeader>
                    <EmailPreviewBody className={mode === 'edit' && errors.lexical ? 'border border-red-500' : ''}>
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
                            <div className='relative mx-auto w-full max-w-[740px] py-6' data-testid='welcome-email-preview'>
                                {showPreviewLoading && (
                                    <div
                                        className='flex min-h-full items-start justify-center pt-24'
                                        data-testid='welcome-email-preview-loading'
                                        style={previewHeight ? {height: `${previewHeight}px`} : undefined}
                                    >
                                        <LoadingIndicator />
                                    </div>
                                )}
                                {previewState.status === 'success' && previewState.preview && (
                                    <div
                                        aria-hidden={!isPreviewReady}
                                        className={cn(
                                            'w-full',
                                            !isPreviewReady && 'pointer-events-none absolute left-0 top-6 opacity-0'
                                        )}
                                    >
                                        <iframe
                                            ref={previewIframeRef}
                                            className='w-full rounded border border-gray-200 bg-white'
                                            data-testid='welcome-email-preview-iframe'
                                            sandbox="allow-same-origin"
                                            srcDoc={previewState.preview.html}
                                            style={{height: previewHeight ? `${previewHeight}px` : '600px'}}
                                            title='Welcome email preview'
                                            onLoad={handlePreviewLoad}
                                        />
                                    </div>
                                )}
                                {(previewState.status === 'error' || previewState.status === 'invalid') && (
                                    <div className='flex h-full items-center justify-center px-4' data-testid='welcome-email-preview-error'>
                                        <Hint color='red'>{previewState.message || 'Failed to render preview'}</Hint>
                                    </div>
                                )}
                            </div>
                        )}
                    </EmailPreviewBody>
                    {mode === 'edit' && errors.lexical && <Hint className='mt-2 max-w-[740px]' color='red'>{errors.lexical}</Hint>}
                </div>
            </EmailPreviewModalContent>
        </Modal>
    );
});

export default WelcomeEmailModal;
