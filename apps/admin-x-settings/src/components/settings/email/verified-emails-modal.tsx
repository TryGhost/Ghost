import NiceModal from '@ebay/nice-modal-react';
import {useState} from 'react';
import {Badge, Button} from '@tryghost/shade';
import {ConfirmationModal, Modal, showToast} from '@tryghost/admin-x-design-system';
import {
    useAddVerifiedEmail,
    useBrowseVerifiedEmails,
    useDeleteVerifiedEmail
} from '@tryghost/admin-x-framework/api/verified-emails';

const VerifiedEmailsModal = NiceModal.create(() => {
    const modal = NiceModal.useModal();
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [resendingEmail, setResendingEmail] = useState<string | null>(null);

    const {data: {verified_emails: verifiedEmails = []} = {}} = useBrowseVerifiedEmails();
    const {mutateAsync: deleteVerifiedEmail} = useDeleteVerifiedEmail();
    const {mutateAsync: addVerifiedEmail} = useAddVerifiedEmail();

    const verified = verifiedEmails.filter(e => e.status === 'verified');
    const pending = verifiedEmails.filter(e => e.status === 'pending');

    const handleDelete = (id: string, email: string) => {
        NiceModal.show(ConfirmationModal, {
            title: 'Remove verified email',
            prompt: <>Are you sure you want to remove <strong>{email}</strong>? Any newsletters or settings using this address will need to be updated.</>,
            okLabel: 'Remove',
            okColor: 'red',
            onOk: async (confirmModal) => {
                setDeletingId(id);
                try {
                    await deleteVerifiedEmail(id);
                    showToast({
                        type: 'success',
                        message: `${email} has been removed`
                    });
                } catch {
                    showToast({
                        type: 'error',
                        message: `Failed to remove ${email}`
                    });
                } finally {
                    setDeletingId(null);
                    confirmModal?.remove();
                }
            }
        });
    };

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
        const isDeleting = deletingId === emailRecord.id;
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
                <div className="flex items-center gap-2">
                    {isPending ? (
                        <Button
                            disabled={isResending}
                            size="sm"
                            variant="outline"
                            onClick={() => handleResend(emailRecord.email)}
                        >
                            {isResending ? 'Resending...' : 'Resend'}
                        </Button>
                    ) : (
                        <Button
                            disabled={isDeleting}
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(emailRecord.id, emailRecord.email)}
                        >
                            {isDeleting ? 'Removing...' : 'Remove'}
                        </Button>
                    )}
                </div>
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
