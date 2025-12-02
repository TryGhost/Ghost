import NiceModal from '@ebay/nice-modal-react';
import {useEffect, useRef, useState} from 'react';

import {Button, HtmlEditor, Modal, TextField} from '@tryghost/admin-x-design-system';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/currentUser';
import {useRouting} from '@tryghost/admin-x-framework/routing';

interface WelcomeEmailModalProps {
    emailType?: 'free' | 'paid';
}

const getDefaultContent = () => {
    return `<p><strong>Welcome! It's great to have you here.</strong></p>
<p>You'll start getting updates right in your inbox. You can also log in any time to read the full archive or catch up on new posts as they go live.</p>
<p>A quick heads-up: if the newsletter doesn't show up, check your <em>spam folder</em> or your Promotions tab and mark this address as not spam.</p>
<p>And remember: everything is always available on <a href="https://example.com">publisherweekly.org</a>.</p>
<p>Thanks for joining — feel free to share it with a friend or two if you think they'd enjoy it.</p>`;
};

const WelcomeEmailModal = NiceModal.create<WelcomeEmailModalProps>(({emailType = 'free'}) => {
    const modal = NiceModal.useModal();
    const {updateRoute} = useRouting();
    const {data: currentUser} = useCurrentUser();
    const [showTestDropdown, setShowTestDropdown] = useState(false);
    const [testEmail, setTestEmail] = useState(currentUser?.email || '');
    const [emailContent, setEmailContent] = useState(getDefaultContent());
    const dropdownRef = useRef<HTMLDivElement>(null);

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
                                label="Save"
                            />
                        </div>
                    </div>
                    <div className='flex items-center'>
                        <div className='w-20 font-semibold'>From:</div>
                        <div>
                            Publisher Weekly
                            <span className='ml-1 text-grey-700'>{`<test@example.com>`}</span>
                        </div>
                    </div>

                    {/* Only display if it's not the same as sender email */}
                    <div className='flex items-center py-1'>
                        <div className='w-20 font-semibold'>Reply-to:</div>
                        <span className='text-grey-700'>hello@example.com</span>
                    </div>

                    <div className='-mt-1 flex items-center'>
                        <div className='w-20 font-semibold'>Subject:</div>
                        <div className='grow'>
                            <TextField className='!h-[34px] w-full' value={'Welcome to Publisher Weekly'}/>
                        </div>
                    </div>
                </div>
                <div className='bg-grey-50 p-6'>
                    <div className='mx-auto max-w-[600px] rounded border border-grey-200 bg-white p-8 text-[1.6rem] leading-[1.6] tracking-[-0.01em] shadow-sm [&_a]:text-black [&_a]:underline [&_p]:mb-4 [&_strong]:font-semibold'>
                        <HtmlEditor
                            nodes='BASIC_NODES'
                            placeholder='Write your welcome email content...'
                            singleParagraph={false}
                            value={emailContent}
                            onChange={setEmailContent}
                        />
                    </div>
                </div>
            </div>
        </Modal>
    );
});

export default WelcomeEmailModal;
