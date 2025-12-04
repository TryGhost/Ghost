import NiceModal from '@ebay/nice-modal-react';
import {useEffect, useRef, useState} from 'react';

import {Button, LexicalEditor, Modal, TextField} from '@tryghost/admin-x-design-system';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/currentUser';
import {useEditAutomatedEmail} from '@tryghost/admin-x-framework/api/automatedEmails';
import {useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import type {AutomatedEmail} from '@tryghost/admin-x-framework/api/automatedEmails';

interface WelcomeEmailModalProps {
    emailType?: 'free' | 'paid';
    automatedEmail?: AutomatedEmail;
}

// Default welcome email content in Lexical JSON format
const DEFAULT_FREE_LEXICAL_CONTENT = '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Welcome! Thanks for subscribing — it\'s great to have you here.","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"You\'ll now receive new posts straight to your inbox. You can also log in any time to read the full archive [link] or catch up on new posts as they go live.","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"A little housekeeping: If this email landed in spam or promotions, try moving it to your primary inbox and adding this address to your contacts. Small signals like that helps your inbox recognize that these messages matter to you.","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Have questions or just want to say hi? Feel free to reply directly to this email or any newsletter in the future.","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}';

const DEFAULT_PAID_LEXICAL_CONTENT = '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Welcome, and thank you for your support — it means a lot.","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"As a paid member, you now have full access to everything: the complete archive, and any paid-only content going forward. New posts will land straight to your inbox, and you can log in any time to catch up [link] on anything you\'ve missed.","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"A little housekeeping: If this email landed in spam or promotions, try moving it to your primary inbox and adding this address to your contacts. Small signals like that helps your inbox recognize that these messages matter to you.","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Have questions or just want to say hi? Feel free to reply directly to this email or any newsletter in the future.","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}';

const getDefaultContent = (emailType: 'free' | 'paid') => {
    return emailType === 'paid' ? DEFAULT_PAID_LEXICAL_CONTENT : DEFAULT_FREE_LEXICAL_CONTENT;
};

const WelcomeEmailModal = NiceModal.create<WelcomeEmailModalProps>(({emailType = 'free', automatedEmail}) => {
    const modal = NiceModal.useModal();
    const {updateRoute} = useRouting();
    const {data: currentUser} = useCurrentUser();
    const [showTestDropdown, setShowTestDropdown] = useState(false);
    const [testEmail, setTestEmail] = useState(currentUser?.email || '');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const {mutateAsync: editAutomatedEmail} = useEditAutomatedEmail();
    const handleError = useHandleError();

    const {formState, updateForm, handleSave, saveState, errors, clearError, okProps} = useForm<AutomatedEmail>({
        initialState: automatedEmail ? {
            ...automatedEmail,
            // Ensure lexical has a value - use default if null/empty
            lexical: automatedEmail.lexical || getDefaultContent(emailType)
        } : {
            id: '',
            status: 'inactive',
            name: emailType === 'paid' ? 'Welcome Email (Paid)' : 'Welcome Email (Free)',
            slug: emailType === 'paid' ? 'member-welcome-email-paid' : 'member-welcome-email-free',
            subject: 'Welcome',
            lexical: getDefaultContent(emailType),
            sender_name: null,
            sender_email: null,
            sender_reply_to: null,
            created_at: new Date().toISOString(),
            updated_at: null
        },
        savingDelay: 500,
        onSave: async (state) => {
            await editAutomatedEmail(state);
        },
        onSaveError: handleError,
        onValidate: (state) => {
            const newErrors: Record<string, string> = {};
            if (!state.subject?.trim()) {
                newErrors.subject = 'Subject is required';
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

    return (
        <Modal
            afterClose={() => {
                updateRoute('memberemails');
            }}
            dirty={saveState === 'unsaved'}
            footer={false}
            header={false}
            testId='welcome-email-modal'
            onCancel={() => {
                modal.remove();
            }}
            onOk={async () => {
                if (await handleSave()) {
                    modal.remove();
                }
            }}
        >
            <div className='-mx-8 h-[calc(100vh-16vmin)] overflow-y-auto'>
                <div className='sticky top-0 flex flex-col gap-2 border-b border-grey-100 bg-white p-5'>
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
                                                placeholder='you@yoursite.com'
                                                value={testEmail}
                                                onChange={e => setTestEmail(e.target.value)}
                                            />
                                        </div>
                                        <div className='flex justify-end'>
                                            <Button
                                                className='w-full'
                                                color="black"
                                                label="Send"
                                                onClick={() => {
                                                    // Handle send test email logic here
                                                    setShowTestDropdown(false);
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                            <Button
                                color={okProps.color}
                                disabled={okProps.disabled}
                                label={okProps.label || 'Save'}
                                onClick={async () => {
                                    if (await handleSave()) {
                                        modal.remove();
                                    }
                                }}
                            />
                        </div>
                    </div>
                    <div className='flex items-center gap-2'>
                        <div className='w-20 font-semibold'>From:</div>
                        <TextField
                            className='!h-[34px] w-48'
                            placeholder='Sender name'
                            value={formState?.sender_name || ''}
                            onChange={e => updateForm(state => ({...state, sender_name: e.target.value}))}
                        />
                        <TextField
                            className='!h-[34px] flex-1'
                            placeholder='noreply@yoursite.com'
                            value={formState?.sender_email || ''}
                            onChange={e => updateForm(state => ({...state, sender_email: e.target.value}))}
                        />
                    </div>

                    <div className='flex items-center gap-2'>
                        <div className='w-20 font-semibold'>Reply-to:</div>
                        <TextField
                            className='!h-[34px] flex-1'
                            placeholder='reply@yoursite.com (optional)'
                            value={formState?.sender_reply_to || ''}
                            onChange={e => updateForm(state => ({...state, sender_reply_to: e.target.value}))}
                        />
                    </div>

                    <div className='-mt-1 flex items-center gap-2'>
                        <div className='w-20 font-semibold'>Subject:</div>
                        <TextField
                            className='!h-[34px] flex-1'
                            error={Boolean(errors.subject)}
                            placeholder='Welcome'
                            value={formState?.subject || ''}
                            onChange={e => updateForm(state => ({...state, subject: e.target.value}))}
                            onKeyDown={() => clearError('subject')}
                        />
                    </div>
                </div>
                <div className='bg-grey-50 p-6'>
                    <div className='mx-auto max-w-[600px] rounded border border-grey-200 bg-white p-8 text-[1.6rem] leading-[1.6] tracking-[-0.01em] shadow-sm [&_a]:text-black [&_a]:underline [&_p]:mb-4 [&_strong]:font-semibold'>
                        <LexicalEditor
                            key={formState?.id || 'new'}
                            nodes='DEFAULT_NODES'
                            placeholder='Write your welcome email content...'
                            singleParagraph={false}
                            value={formState?.lexical || getDefaultContent(emailType)}
                            onChange={lexical => updateForm(state => ({...state, lexical}))}
                        />
                    </div>
                </div>
            </div>
        </Modal>
    );
});

export default WelcomeEmailModal;
