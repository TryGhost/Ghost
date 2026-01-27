import NiceModal from '@ebay/nice-modal-react';
import {useEffect, useRef, useState} from 'react';

import MemberEmailEditor from './member-email-editor';
import {Button, Hint, Modal, TextField} from '@tryghost/admin-x-design-system';
import {useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';

import TestEmailDropdown from './test-email-dropdown';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useAddAutomatedEmail, useEditAutomatedEmail} from '@tryghost/admin-x-framework/api/automated-emails';
import {useGlobalData} from '../../../../components/providers/global-data-provider';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import type {AutomatedEmail} from '@tryghost/admin-x-framework/api/automated-emails';

interface WelcomeEmailModalProps {
    emailType: 'free' | 'paid';
    automatedEmail: AutomatedEmail | null;
    defaultSubject?: string;
    defaultContent?: string;
    onClose?: () => void;
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

const WelcomeEmailModal = NiceModal.create<WelcomeEmailModalProps>(({emailType = 'free', automatedEmail, defaultSubject, defaultContent, onClose}) => {
    const {updateRoute} = useRouting();
    const {mutateAsync: editAutomatedEmail} = useEditAutomatedEmail();
    const {mutateAsync: addAutomatedEmail} = useAddAutomatedEmail();
    const [showTestDropdown, setShowTestDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const handleError = useHandleError();
    const {settings} = useGlobalData();
    const [siteTitle, defaultEmailAddress] = getSettingValues<string>(settings, ['title', 'default_email_address']);

    // Track the created email so we can enable the Test button after creation
    const [createdEmail, setCreatedEmail] = useState<AutomatedEmail | null>(null);

    // Use created email if we just created one, otherwise use the prop
    const currentEmail = createdEmail || automatedEmail;

    const {formState, saveState, updateForm, handleSave, okProps, errors, validate} = useForm({
        initialState: {
            subject: automatedEmail?.subject || defaultSubject || 'Welcome',
            lexical: automatedEmail?.lexical || defaultContent || ''
        },
        savingDelay: 500,
        onSave: async (state) => {
            if (!currentEmail) {
                // Create new entry with status active
                const response = await addAutomatedEmail({
                    name: emailType === 'free' ? 'Welcome Email (Free)' : 'Welcome Email (Paid)',
                    slug: `member-welcome-email-${emailType}`,
                    subject: state.subject,
                    status: 'active',
                    lexical: state.lexical
                });
                // Store the created email so we can use its ID for the Test button
                if (response?.automated_emails?.[0]) {
                    setCreatedEmail(response.automated_emails[0]);
                }
            } else {
                await editAutomatedEmail({...currentEmail, ...state});
            }
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

    const senderEmail = automatedEmail?.sender_email || defaultEmailAddress;
    const replyToEmail = automatedEmail?.sender_reply_to || defaultEmailAddress;

    return (
        <Modal
            afterClose={() => {
                updateRoute('memberemails');
                onClose?.();
            }}
            dirty={saveState === 'unsaved'}
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
                                <Button
                                    className='border border-grey-200 font-semibold hover:border-grey-300 hover:!bg-white dark:border-grey-900 dark:hover:border-grey-800 dark:hover:!bg-grey-950'
                                    color="clear"
                                    disabled={!currentEmail}
                                    icon='send'
                                    label="Test"
                                    onClick={() => setShowTestDropdown(!showTestDropdown)}
                                />
                                {showTestDropdown && currentEmail && (
                                    <TestEmailDropdown automatedEmailId={currentEmail.id} lexical={formState.lexical} subject={formState.subject} validateForm={validate} onClose={() => setShowTestDropdown(false)} />
                                )}
                            </div>
                            <Button
                                color={okProps.color}
                                disabled={okProps.disabled}
                                label={okProps.label || 'Save'}
                                onClick={async () => await handleSave({fakeWhenUnchanged: true})}
                            />
                        </div>
                    </div>
                    <div className='flex items-center'>
                        <div className='w-20 font-semibold'>From:</div>
                        <div className='flex grow items-center gap-1'>
                            <span>{automatedEmail?.sender_name || siteTitle}</span>
                            <span className='text-grey-700 dark:text-grey-400'>{`<${senderEmail}>`}</span>
                        </div>
                    </div>
                    {replyToEmail !== senderEmail && (
                        <div className='flex items-center py-0.5'>
                            <div className='w-20 font-semibold'>Reply-to:</div>
                            <div className='grow text-grey-700 dark:text-grey-400'>
                                {replyToEmail}
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
                    <div className={`mx-auto w-full max-w-[600px] grow rounded border bg-white p-8 shadow-sm dark:bg-grey-950/25 dark:shadow-none ${errors.lexical ? 'border-red' : 'border-grey-200 dark:border-grey-925'}`}>
                        <MemberEmailEditor
                            key={automatedEmail?.id || 'new'}
                            className='welcome-email-editor'
                            placeholder='Write your welcome email content...'
                            singleParagraph={false}
                            value={formState.lexical}
                            onChange={lexical => updateForm(state => ({...state, lexical}))}
                        />
                    </div>
                    {errors.lexical && <Hint className='ml-8 mr-auto mt-2 max-w-[600px]' color='red'>{errors.lexical}</Hint>}
                </div>
            </div>
        </Modal>
    );
});

export default WelcomeEmailModal;
