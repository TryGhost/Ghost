import validator from 'validator';
import {Button, Hint, TextField} from '@tryghost/admin-x-design-system';
import {JSONError} from '@tryghost/admin-x-framework/errors';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/current-user';
import {useEffect, useRef, useState} from 'react';
import {useSendTestWelcomeEmail} from '@tryghost/admin-x-framework/api/automated-emails';

export interface TestEmailDropdownProps {
  automatedEmailId: string
  subject: string
  lexical: string
  validateForm: () => boolean
  onClose: () => void
}

const TestEmailDropdown: React.FC<TestEmailDropdownProps> = ({
    automatedEmailId,
    subject,
    lexical,
    validateForm,
    onClose
}) => {
    const {data: currentUser} = useCurrentUser();
    const {mutateAsync: sendTestEmail} = useSendTestWelcomeEmail();

    const [testEmail, setTestEmail] = useState(currentUser?.email || '');
    const [testEmailError, setTestEmailError] = useState('');
    const [sendState, setSendState] = useState<'idle' | 'sending' | 'sent'>('idle');
    const sendStateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        return () => {
            if (sendStateTimeoutRef.current) {
                clearTimeout(sendStateTimeoutRef.current);
            }
        };
    }, []);

    // Update test email when current user data loads
    useEffect(() => {
        if (currentUser?.email) {
            setTestEmail(currentUser.email);
        }
    }, [currentUser?.email]);

    // Close dropdown on Escape and stop propagation to prevent modal from *also* closing
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown, true);
        return () => document.removeEventListener('keydown', handleKeyDown, true);
    }, [onClose]);

    const handleSendTestEmail = async () => {
        setTestEmailError('');

        if (!validator.isEmail(testEmail)) {
            setTestEmailError('Please enter a valid email address');
            return;
        }

        // check that subject and lexical are valid
        if (!validateForm()) {
            setTestEmailError('Please complete the required fields');
            return;
        }

        setSendState('sending');

        try {
            await sendTestEmail({
                id: automatedEmailId,
                email: testEmail,
                subject,
                lexical
            });
            setSendState('sent');
            if (sendStateTimeoutRef.current) {
                clearTimeout(sendStateTimeoutRef.current);
            }
            sendStateTimeoutRef.current = setTimeout(() => setSendState('idle'), 2000);
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

    return (
        <div className='absolute right-0 top-full z-10 mt-2 w-[260px] rounded border border-grey-250 bg-white p-4 shadow-lg dark:border-grey-925 dark:bg-grey-975'>
            <div className='mb-3'>
                <label className='mb-2 block text-sm font-semibold' htmlFor='test-email-input'>Send test email</label>
                <TextField
                    className='!h-[36px]'
                    id='test-email-input'
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
            {testEmailError && <Hint className='mt-2' color='red'>{testEmailError}</Hint>}
        </div>
    );
};

export default TestEmailDropdown;
