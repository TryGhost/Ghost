import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React from 'react';
import {useCallback, useEffect, useRef, useState} from 'react';

import MemberEmailEditor from './member-email-editor';
import useFeatureFlag from '../../../../hooks/use-feature-flag';
import {Hint, Button as LegacyButton, Modal, TextField} from '@tryghost/admin-x-design-system';
import {confirmIfDirty} from '@tryghost/admin-x-design-system';
import {useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useWelcomeEmailSenderDetails} from '../../../../hooks/use-welcome-email-sender-details';

import TestEmailDropdown from './test-email-dropdown';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useEditAutomatedEmail} from '@tryghost/admin-x-framework/api/automated-emails';
import {useGlobalData} from '../../../../components/providers/global-data-provider';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import type {AutomatedEmail} from '@tryghost/admin-x-framework/api/automated-emails';

import {
    Button,
    Dialog,
    DialogClose,
    DialogContent,
    DialogTitle,
    LucideIcon,
    ToggleGroup,
    ToggleGroupItem,
    cn
} from '@tryghost/shade';

interface EmailPreviewModalContentProps {
    title: string;
    deviceSize?: 'desktop' | 'mobile';
    onDeviceSizeChange?: (size: 'desktop' | 'mobile') => void;
    headerActions?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}

const EmailPreviewModalContent = React.forwardRef<
    HTMLDivElement,
    EmailPreviewModalContentProps
>(({title, deviceSize = 'desktop', onDeviceSizeChange, headerActions, children, className}, ref) => (
    <DialogContent
        ref={ref}
        className={cn(
            'inset-0 m-[2vmin] flex w-auto max-w-none translate-x-0 flex-col gap-0 overflow-hidden rounded-xl bg-gray-100 p-0',
            'data-[state=open]:zoom-in-[0.98] data-[state=closed]:zoom-out-[0.98] data-[state=open]:slide-in-from-left-0 data-[state=closed]:slide-out-to-left-0',
            'dark:bg-gray-975',
            className
        )}
    >
        <div className="border-gray-200 dark:border-gray-900 dark:bg-gray-975 flex shrink-0 items-center justify-between border-b bg-white px-5 py-3">
            <DialogTitle className="text-sm font-semibold">
                {title}
            </DialogTitle>
            <div className="absolute left-1/2 -translate-x-1/2">
                <ToggleGroup
                    type="single"
                    value={deviceSize}
                    onValueChange={(value) => {
                        if (value && onDeviceSizeChange) {
                            onDeviceSizeChange(value as 'desktop' | 'mobile');
                        }
                    }}
                >
                    <ToggleGroupItem aria-label="Desktop preview" value="desktop">
                        <LucideIcon.Monitor className="size-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem aria-label="Mobile preview" value="mobile">
                        <LucideIcon.Smartphone className="size-4" />
                    </ToggleGroupItem>
                </ToggleGroup>
            </div>
            <div className="flex items-center gap-2">
                {headerActions}
            </div>
        </div>
        <div className="flex min-h-0 grow flex-col overflow-y-auto">
            {children}
        </div>
    </DialogContent>
));
EmailPreviewModalContent.displayName = 'EmailPreviewModalContent';

interface EmailPreviewEmailHeaderProps {
    children: React.ReactNode;
    className?: string;
}

const EmailPreviewEmailHeader: React.FC<EmailPreviewEmailHeaderProps> = ({children, className}) => (
    <div className={cn(
        'mx-auto w-full max-w-[740px] rounded-t-lg border border-b-0 border-gray-200 bg-white px-6 py-4 dark:border-gray-900 dark:bg-gray-950',
        className
    )}>
        {children}
    </div>
);

interface EmailPreviewBodyProps {
    children: React.ReactNode;
    className?: string;
    isMobile?: boolean;
}

const EmailPreviewBody: React.FC<EmailPreviewBodyProps> = ({children, className, isMobile}) => (
    <div className={cn(
        'mx-auto w-full grow rounded-b-lg border border-gray-200 bg-white shadow-sm dark:border-gray-900 dark:bg-gray-950 dark:shadow-none',
        isMobile ? 'max-w-[460px]' : 'max-w-[740px]',
        className
    )}>
        {children}
    </div>
);

interface WelcomeEmailModalProps {
    emailType: 'free' | 'paid';
    automatedEmail: AutomatedEmail;
}

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

const WelcomeEmailModal = NiceModal.create<WelcomeEmailModalProps>(({emailType = 'free', automatedEmail}) => {
    const modal = useModal();
    const {updateRoute} = useRouting();
    const {mutateAsync: editAutomatedEmail} = useEditAutomatedEmail();
    const [showTestDropdown, setShowTestDropdown] = useState(false);
    const [deviceSize, setDeviceSize] = useState<'desktop' | 'mobile'>('desktop');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const normalizedLexical = useRef<string>(automatedEmail?.lexical || '');
    const hasEditorBeenFocused = useRef(false);
    const handleError = useHandleError();
    const {settings} = useGlobalData();
    const [siteTitle] = getSettingValues<string>(settings, ['title']);
    const {resolvedSenderName, resolvedSenderEmail, resolvedReplyToEmail, hasDistinctReplyTo} = useWelcomeEmailSenderDetails(automatedEmail);
    const welcomeEmailEditorEnabled = useFeatureFlag('welcomeEmailEditor');

    const {formState, saveState, updateForm, setFormState, handleSave, okProps, errors, validate} = useForm({
        initialState: {
            subject: automatedEmail?.subject || 'Welcome',
            lexical: automatedEmail?.lexical || ''
        },
        savingDelay: 500,
        onSave: async (state) => {
            await editAutomatedEmail({...automatedEmail, ...state});
        },
        onSaveError: handleError,
        onValidate: (state) => {
            const newErrors: Record<string, string> = {};

            if (!state.subject?.trim()) {
                newErrors.subject = 'A subject is required';
            }

            if (isEmptyLexical(state.lexical)) {
                newErrors.lexical = 'Email content is required';
            }

            return newErrors;
        }
    });
    const saveButtonLabel = okProps.label || 'Save';

    const isDirty = saveState === 'unsaved';

    const handleClose = useCallback(() => {
        confirmIfDirty(isDirty, () => {
            modal.remove();
            updateRoute('memberemails');
        });
    }, [isDirty, modal, updateRoute]);

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

    if (!welcomeEmailEditorEnabled) {
        return (
            <Modal
                afterClose={() => {
                    updateRoute('memberemails');
                }}
                dirty={isDirty}
                footer={false}
                header={false}
                testId='welcome-email-modal'
                width={672}
            >
                <div className='-mx-8 flex h-[calc(100vh-16vmin)] flex-col overflow-y-auto dark:!bg-grey-975'>
                    <div className='sticky top-0 z-10 flex flex-col gap-2 border-b border-grey-100 bg-white p-5 dark:border-grey-900 dark:bg-grey-975'>
                        <div className='mb-2 flex items-center justify-between'>
                            <h3 className='font-semibold'>{emailType === 'paid' ? 'Paid' : 'Free'} members welcome email</h3>
                            <div className='flex items-center gap-2'>
                                <div ref={dropdownRef} className='relative'>
                                    <LegacyButton
                                        className='border border-grey-200 font-semibold hover:border-grey-300 hover:!bg-white dark:border-grey-900 dark:hover:border-grey-800 dark:hover:!bg-grey-950'
                                        color="clear"
                                        icon='send'
                                        label="Test"
                                        onClick={() => setShowTestDropdown(!showTestDropdown)}
                                    />
                                    {showTestDropdown && (
                                        <TestEmailDropdown automatedEmailId={automatedEmail.id} lexical={formState.lexical} subject={formState.subject} validateForm={validate} onClose={() => setShowTestDropdown(false)} />
                                    )}
                                </div>
                                <LegacyButton
                                    color={okProps.color}
                                    disabled={okProps.disabled}
                                    label={saveButtonLabel}
                                    onClick={async () => await handleSave({fakeWhenUnchanged: true})}
                                />
                            </div>
                        </div>
                        <div className='flex items-center'>
                            <div className='w-20 font-semibold'>From:</div>
                            <div className='flex grow items-center gap-1'>
                                <span>{resolvedSenderName}</span>
                                <span className='text-grey-700 dark:text-grey-400'>{`<${resolvedSenderEmail}>`}</span>
                            </div>
                        </div>
                        {hasDistinctReplyTo && (
                            <div className='flex items-center py-0.5'>
                                <div className='w-20 font-semibold'>Reply-to:</div>
                                <div className='grow text-grey-700 dark:text-grey-400'>
                                    {resolvedReplyToEmail}
                                </div>
                            </div>
                        )}
                        <div className='flex items-center'>
                            <div className='w-20 font-semibold'>Subject:</div>
                            <div className='grow'>
                                <TextField
                                    className='w-full'
                                    error={Boolean(errors.subject)}
                                    hint={errors.subject || ''}
                                    maxLength={300}
                                    placeholder={`Welcome to ${siteTitle}`}
                                    value={formState.subject}
                                    onChange={e => updateForm(state => ({...state, subject: e.target.value}))}
                                />
                            </div>
                        </div>
                    </div>
                    <div className='flex grow flex-col bg-grey-50 p-8 dark:bg-grey-975'>
                        <div
                            className={`mx-auto w-full max-w-[600px] grow rounded border bg-white p-8 shadow-sm dark:bg-grey-950/25 dark:shadow-none ${errors.lexical ? 'border-red' : 'border-grey-200 dark:border-grey-925'}`}
                            onFocus={() => {
                                hasEditorBeenFocused.current = true;
                            }}
                        >
                            <MemberEmailEditor
                                key={automatedEmail?.id || 'new'}
                                className='welcome-email-editor'
                                placeholder='Write your welcome email content...'
                                singleParagraph={false}
                                value={formState.lexical}
                                onChange={handleEditorChange}
                            />
                        </div>
                        {errors.lexical && <Hint className='ml-8 mr-auto mt-2 max-w-[600px]' color='red'>{errors.lexical}</Hint>}
                    </div>
                </div>
            </Modal>
        );
    }

    return (
        <Dialog
            open={modal.visible}
            onOpenChange={(open) => {
                if (!open) {
                    handleClose();
                }
            }}
        >
            <EmailPreviewModalContent
                deviceSize={deviceSize}
                headerActions={
                    <>
                        <DialogClose asChild>
                            <Button variant="outline" onClick={handleClose}>Close</Button>
                        </DialogClose>
                        <Button
                            disabled={okProps.disabled}
                            onClick={async () => await handleSave({fakeWhenUnchanged: true})}
                        >
                            {saveButtonLabel}
                        </Button>
                    </>
                }
                title='Welcome email'
                onDeviceSizeChange={setDeviceSize}
            >
                <div className='flex grow flex-col items-center p-8'>
                    <EmailPreviewEmailHeader className={deviceSize === 'mobile' ? 'max-w-[460px]' : ''}>
                        <div className='flex flex-col gap-2'>
                            <div className='flex items-center'>
                                <div className='w-20 text-sm font-semibold'>From:</div>
                                <div className='flex grow items-center gap-1 text-sm'>
                                    <span>{resolvedSenderName}</span>
                                    <span className='text-gray-500 dark:text-gray-400'>{`<${resolvedSenderEmail}>`}</span>
                                </div>
                                <div ref={dropdownRef} className='relative'>
                                    <LegacyButton
                                        className='border border-grey-200 font-semibold hover:border-grey-300 hover:!bg-white dark:border-grey-900 dark:hover:border-grey-800 dark:hover:!bg-grey-950'
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
                                    <div className='w-20 text-sm font-semibold'>Reply-to:</div>
                                    <div className='text-gray-500 dark:text-gray-400 grow text-sm'>
                                        {resolvedReplyToEmail}
                                    </div>
                                </div>
                            )}
                            <div className='flex items-center'>
                                <div className='w-20 text-sm font-semibold'>Subject:</div>
                                <div className='grow'>
                                    <TextField
                                        className='w-full'
                                        error={Boolean(errors.subject)}
                                        hint={errors.subject || ''}
                                        maxLength={300}
                                        placeholder={`Welcome to ${siteTitle}`}
                                        value={formState.subject}
                                        onChange={e => updateForm(state => ({...state, subject: e.target.value}))}
                                    />
                                </div>
                            </div>
                        </div>
                    </EmailPreviewEmailHeader>
                    <EmailPreviewBody
                        className={cn(
                            errors.lexical ? 'border-red-500' : '',
                            deviceSize === 'desktop' ? 'px-8' : '',
                            deviceSize === 'mobile' ? 'px-6' : ''
                        )}
                        isMobile={deviceSize === 'mobile'}
                    >
                        <div
                            className={cn(
                                deviceSize === 'desktop'
                                    ? 'mx-auto w-full max-w-[540px] py-8'
                                    : deviceSize === 'mobile'
                                        ? 'mx-auto w-full max-w-[332px] px-10 py-8'
                                        : 'p-8'
                            )}
                            onFocus={() => {
                                hasEditorBeenFocused.current = true;
                            }}
                        >
                            <MemberEmailEditor
                                key={automatedEmail?.id || 'new'}
                                className='welcome-email-editor'
                                placeholder='Write your welcome email content...'
                                singleParagraph={false}
                                value={formState.lexical}
                                onChange={handleEditorChange}
                            />
                        </div>
                    </EmailPreviewBody>
                    {errors.lexical && <Hint className='mt-2 max-w-[740px]' color='red'>{errors.lexical}</Hint>}
                </div>
            </EmailPreviewModalContent>
        </Dialog>
    );
});

export default WelcomeEmailModal;
