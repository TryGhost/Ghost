import NiceModal from '@ebay/nice-modal-react';
import {Badge, Button} from '@tryghost/shade';
import {Modal, showToast} from '@tryghost/admin-x-design-system';
import {
    useAddVerifiedEmail,
    useBrowseVerifiedEmails
} from '@tryghost/admin-x-framework/api/verified-emails';
import {useState} from 'react';

const VerifiedEmailsModal = NiceModal.create(() => {
    const modal = NiceModal.useModal();
    const [resendingEmail, setResendingEmail] = useState<string | null>(null);

    const {data: {verified_emails: verifiedEmails = []} = {}} = useBrowseVerifiedEmails();
    const {mutateAsync: addVerifiedEmail} = useAddVerifiedEmail();

    const verified = verifiedEmails.filter(e => e.status === 'verified');
    const pending = verifiedEmails.filter(e => e.status === 'pending');

    const handleResend = async (email: string) => {
        setResendingEmail(email);
        try {
            await addVerifiedEmail({email});
            showToast({
                type: 'info',
                message: `Verification email resent to ${email}`
            });
        } catch {
            showToast({
                type: 'error',
                message: `Failed to resend verification email to ${email}`
            });
        } finally {
            setResendingEmail(null);
        }
    };

    const renderEmailRow = (emailRecord: {id: string; email: string; status: 'pending' | 'verified'}) => {
        const isPending = emailRecord.status === 'pending';
        const isResending = resendingEmail === emailRecord.email;

        return (
            <div
                key={emailRecord.id}
                className="flex items-center justify-between border-b border-grey-100 py-3 last:border-b-0"
                data-testid={`verified-email-row-${emailRecord.email}`}
            >
                <div className="flex items-center gap-2">
                    <span className="text-sm">{emailRecord.email}</span>
                    {isPending && (
                        <Badge variant="outline">Pending</Badge>
                    )}
                </div>
                {isPending && (
                    <div className="flex items-center gap-2">
                        <Button
                            disabled={isResending}
                            size="sm"
                            variant="outline"
                            onClick={() => handleResend(emailRecord.email)}
                        >
                            {isResending ? 'Resending...' : 'Resend'}
                        </Button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <Modal
            cancelLabel="Close"
            footer={false}
            testId="verified-emails-modal"
            title="Verified email addresses"
            topRightContent="close"
            width={540}
            onCancel={() => modal.remove()}
        >
            <div className="py-2">
                {verifiedEmails.length === 0 ? (
                    <p className="py-4 text-center text-sm text-grey-600">
                        No verified email addresses yet.
                    </p>
                ) : (
                    <>
                        {verified.map(emailRecord => renderEmailRow(emailRecord))}
                        {pending.map(emailRecord => renderEmailRow(emailRecord))}
                    </>
                )}
            </div>
        </Modal>
    );
});

export default VerifiedEmailsModal;

NiceModal.register('verified-emails-modal', VerifiedEmailsModal);
