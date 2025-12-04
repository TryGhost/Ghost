import NiceModal from '@ebay/nice-modal-react';
import validator from 'validator';
import {useEffect, useRef, useState} from 'react';

import MemberEmailEditor from './member-email-editor';
import {Button, Modal, TextField} from '@tryghost/admin-x-design-system';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/currentUser';
import {useEditAutomatedEmail} from '@tryghost/admin-x-framework/api/automatedEmails';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import type {AutomatedEmail} from '@tryghost/admin-x-framework/api/automatedEmails';

interface WelcomeEmailModalProps {
    emailType?: 'free' | 'paid';
    automatedEmail?: AutomatedEmail;
}

const WelcomeEmailModal = NiceModal.create<WelcomeEmailModalProps>(({emailType = 'free', automatedEmail}) => {
    const modal = NiceModal.useModal();
    const {updateRoute} = useRouting();
    const {data: currentUser} = useCurrentUser();
    const {mutateAsync: editAutomatedEmail} = useEditAutomatedEmail();
    const [showTestDropdown, setShowTestDropdown] = useState(false);
    const [testEmail, setTestEmail] = useState(currentUser?.email || '');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Form state for editable fields
    const [formData, setFormData] = useState({
        subject: automatedEmail?.subject || 'Welcome',
        lexical: automatedEmail?.lexical || '',
        sender_name: automatedEmail?.sender_name || '',
        sender_email: automatedEmail?.sender_email || '',
        sender_reply_to: automatedEmail?.sender_reply_to || ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<{sender_email?: string; sender_reply_to?: string}>({});

    // Track if form has changes
    const hasChanges = automatedEmail && (
        formData.subject !== (automatedEmail.subject || '') ||
        formData.lexical !== (automatedEmail.lexical || '') ||
        formData.sender_name !== (automatedEmail.sender_name || '') ||
        formData.sender_email !== (automatedEmail.sender_email || '') ||
        formData.sender_reply_to !== (automatedEmail.sender_reply_to || '')
    );

    const updateFormData = (key: keyof typeof formData, value: string) => {
        setFormData(prev => ({...prev, [key]: value}));
        // Clear error when user starts typing
        if (key === 'sender_email' || key === 'sender_reply_to') {
            setErrors(prev => ({...prev, [key]: undefined}));
        }
    };

    const validateForm = (): boolean => {
        const newErrors: typeof errors = {};

        if (formData.sender_email && !validator.isEmail(formData.sender_email)) {
            newErrors.sender_email = 'Enter a valid email address';
        }

        if (formData.sender_reply_to && !validator.isEmail(formData.sender_reply_to)) {
            newErrors.sender_reply_to = 'Enter a valid email address';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!automatedEmail || !validateForm()) {
            return;
        }

        setIsSaving(true);
        try {
            await editAutomatedEmail({
                ...automatedEmail,
                subject: formData.subject,
                lexical: formData.lexical || null,
                sender_name: formData.sender_name || null,
                sender_email: formData.sender_email || null,
                sender_reply_to: formData.sender_reply_to || null
            });
            modal.remove();
        } catch (error) {
            showToast({
                type: 'error',
                message: 'Failed to save welcome email'
            });
        } finally {
            setIsSaving(false);
        }
    };

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
            footer={false}
            header={false}
            testId='welcome-email-modal'
            onCancel={() => {
                modal.remove();
            }}
            onOk={() => {
                modal.remove();
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
                                color="black"
                                disabled={!hasChanges || isSaving}
                                label={isSaving ? 'Saving...' : 'Save'}
                                onClick={handleSave}
                            />
                        </div>
                    </div>
                    <div className='flex items-center'>
                        <div className='w-20 font-semibold'>From:</div>
                        <div className='flex grow items-center gap-2'>
                            <TextField
                                className='!h-[34px]'
                                maxLength={191}
                                placeholder='Sender name'
                                value={formData.sender_name}
                                onChange={e => updateFormData('sender_name', e.target.value)}
                            />
                            <TextField
                                className='!h-[34px] grow'
                                error={Boolean(errors.sender_email)}
                                hint={errors.sender_email}
                                maxLength={191}
                                placeholder='noreply@example.com'
                                value={formData.sender_email}
                                onChange={e => updateFormData('sender_email', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className='flex items-center'>
                        <div className='w-20 font-semibold'>Reply-to:</div>
                        <div className='grow'>
                            <TextField
                                className='!h-[34px] w-full'
                                error={Boolean(errors.sender_reply_to)}
                                hint={errors.sender_reply_to}
                                maxLength={191}
                                placeholder='reply@example.com'
                                value={formData.sender_reply_to}
                                onChange={e => updateFormData('sender_reply_to', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className='-mt-1 flex items-center'>
                        <div className='w-20 font-semibold'>Subject:</div>
                        <div className='grow'>
                            <TextField
                                className='!h-[34px] w-full'
                                maxLength={300}
                                value={formData.subject}
                                onChange={e => updateFormData('subject', e.target.value)}
                            />
                        </div>
                    </div>
                </div>
                <div className='bg-grey-50 p-6'>
                    <div className='mx-auto max-w-[600px] rounded border border-grey-200 bg-white p-8 text-[1.6rem] leading-[1.6] tracking-[-0.01em] shadow-sm [&_a]:text-black [&_a]:underline [&_p]:mb-4 [&_strong]:font-semibold'>
                        <MemberEmailEditor
                            key={automatedEmail?.id || 'new'}
                            nodes='DEFAULT_NODES'
                            placeholder='Write your welcome email content...'
                            singleParagraph={false}
                            value={formData.lexical}
                            onChange={lexical => updateFormData('lexical', lexical)}
                        />
                    </div>
                </div>
            </div>
        </Modal>
    );
});

export default WelcomeEmailModal;
