import NiceModal from '@ebay/nice-modal-react';
import validator from 'validator';
import {useEffect, useRef, useState} from 'react';

import MemberEmailEditor from './member-email-editor';
import {Button, Hint, Modal, TextField} from '@tryghost/admin-x-design-system';
import {useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';

import {JSONError} from '@tryghost/admin-x-framework/errors';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/current-user';
import {useEditAutomatedEmail, useSendTestWelcomeEmail} from '@tryghost/admin-x-framework/api/automated-emails';
import {useGlobalData} from '../../../../components/providers/global-data-provider';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import type {AutomatedEmail} from '@tryghost/admin-x-framework/api/automated-emails';

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
    const {updateRoute} = useRouting();
    const {data: currentUser} = useCurrentUser();
    const {mutateAsync: editAutomatedEmail} = useEditAutomatedEmail();
    const {mutateAsync: sendTestEmail} = useSendTestWelcomeEmail();
    const [showTestDropdown, setShowTestDropdown] = useState(false);
    const [testEmail, setTestEmail] = useState(currentUser?.email || '');
    const [testEmailError, setTestEmailError] = useState('');
    const [sendState, setSendState] = useState<'idle' | 'sending' | 'sent'>('idle');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const sendStateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleError = useHandleError();
    const {settings} = useGlobalData();
    const [siteTitle, defaultEmailAddress] = getSettingValues<string>(settings, ['title', 'default_email_address']);

    const {formState, saveState, updateForm, handleSave, okProps, errors} = useForm({
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

            if (!state.subject) {
                newErrors.subject = 'A subject is required';
            }

            if (isEmptyLexical(state.lexical)) {
                newErrors.lexical = 'Email content is required';
            }

            return newErrors;
        }
    });

    // Update test email when current user data loads
    useEffect(() => {
        if (currentUser?.email) {
            setTestEmail(currentUser.email);
        }
    }, [currentUser?.email]);

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

    useEffect(() => () => clearTimeout(sendStateTimeoutRef.current!), []);

    const handleSendTestEmail = async () => {
        setTestEmailError('');

        if (!validator.isEmail(testEmail)) {
            setTestEmailError('Please enter a valid email address');
            return;
        }

        setSendState('sending');

        try {
            await handleSave({fakeWhenUnchanged: true});
            await sendTestEmail({id: automatedEmail.id, email: testEmail});
            setSendState('sent');
            clearTimeout(sendStateTimeoutRef.current!);
            sendStateTimeoutRef.current = setTimeout(() => setSendState('idle'), 2500);
        } catch (error) {
            setSendState('idle');
            let message;
            if (error instanceof JSONError && error.data && error.data.errors[0]) {
                message = error.data.errors[0].context || error.data.errors[0].message;
            } else if (error instanceof Error) {
                message = error.message;
            }
            setTestEmailError(message || 'Failed to send test email');
        }
    };

    const senderEmail = automatedEmail?.sender_email || defaultEmailAddress;
    const replyToEmail = automatedEmail?.sender_reply_to || defaultEmailAddress;

    return (
        <Modal
            afterClose={() => {
                updateRoute('memberemails');
            }}
            dirty={saveState === 'unsaved'}
            footer={false}
            header={false}
            testId='welcome-email-modal'
        >
            <div className='-mx-8 h-[calc(100vh-16vmin)] overflow-y-auto'>
                <div className='sticky top-0 z-10 flex flex-col gap-2 border-b border-grey-100 bg-white p-5'>
                    <div className='mb-2 flex items-center justify-between'>
                        <h3 className='font-semibold'>{emailType === 'paid' ? 'Paid' : 'Free'} members welcome email</h3>
                        <div className='flex items-center gap-2'>
                            <div ref={dropdownRef} className='relative'>
                                <Button
                                    className='border border-grey-200 font-semibold hover:border-grey-300 hover:!bg-white'
                                    color="clear"
                                    icon='send'
                                    label="Test"
                                    onClick={() => setShowTestDropdown(!showTestDropdown)}
                                />
                                {showTestDropdown && (
                                    <div className='absolute right-0 top-full z-10 mt-2 w-[260px] rounded border border-grey-200 bg-white p-4 shadow-lg'>
                                        <div className='mb-3'>
                                            <label className='mb-2 block text-sm font-semibold'>Send test email</label>
                                            <TextField
                                                className='!h-[36px]'
                                                error={Boolean(testEmailError)}
                                                hint={testEmailError}
                                                placeholder='you@yoursite.com'
                                                value={testEmail}
                                                onChange={(e) => {
                                                    setTestEmail(e.target.value);
                                                }}
                                            />
                                        </div>
                                        <Button
                                            className='w-full'
                                            color={sendState === 'sent' ? 'green' : 'black'}
                                            disabled={sendState === 'sending'}
                                            label={sendState === 'sent' ? 'Sent' : sendState === 'sending' ? 'Sending...' : 'Send'}
                                            onClick={handleSendTestEmail}
                                        />
                                    </div>
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
                            <span className='text-grey-700'>{`<${senderEmail}>`}</span>
                        </div>
                    </div>
                    {replyToEmail !== senderEmail && (
                        <div className='flex items-center py-0.5'>
                            <div className='w-20 font-semibold'>Reply-to:</div>
                            <div className='grow text-grey-700'>
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
                <div className='bg-grey-50 p-6'>
                    <div className={`mx-auto max-w-[600px] rounded border bg-white p-8 text-[1.6rem] leading-[1.6] tracking-[-0.01em] shadow-sm [&_a]:text-black [&_a]:underline [&_p]:mb-4 [&_strong]:font-semibold ${errors.lexical ? 'border-red' : 'border-grey-200'}`}>
                        <MemberEmailEditor
                            key={automatedEmail?.id || 'new'}
                            nodes='DEFAULT_NODES'
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
