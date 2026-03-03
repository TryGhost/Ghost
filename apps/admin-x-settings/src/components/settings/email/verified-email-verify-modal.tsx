import NiceModal from '@ebay/nice-modal-react';
import React, {useEffect, useState} from 'react';
import {APIError} from '@tryghost/admin-x-framework/errors';
import {ConfirmationModal} from '@tryghost/admin-x-design-system';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import {useVerifyVerifiedEmail} from '@tryghost/admin-x-framework/api/verified-emails';
import type {RoutingModalProps} from '@tryghost/admin-x-framework/routing';

const PROPERTY_LABELS: Record<string, string> = {
    sender_email: 'sender',
    sender_reply_to: 'reply-to'
};

const VerifiedEmailVerifyModal: React.FC<RoutingModalProps> = ({searchParams}) => {
    const token = searchParams?.get('verifyEmail');
    const {mutateAsync: verifyEmail} = useVerifyVerifiedEmail();
    const handleError = useHandleError();
    const {updateRoute} = useRouting();
    const [hasVerified, setHasVerified] = useState(false);

    useEffect(() => {
        if (!token || hasVerified) {
            return;
        }

        setHasVerified(true);

        const verify = async () => {
            try {
                const {email, context} = await verifyEmail({token});

                let title: string;
                let prompt: React.ReactNode;

                if (context?.type === 'newsletter' && context.property) {
                    const propertyLabel = PROPERTY_LABELS[context.property] || context.property;
                    title = 'Email address verified';
                    prompt = <>Newsletter will now use <strong>{email}</strong> as the {propertyLabel} address.</>;
                } else if (context?.type === 'setting') {
                    title = 'Support email verified';
                    prompt = <>Your support email address has been updated to <strong>{email}</strong>.</>;
                } else {
                    title = 'Email address verified';
                    prompt = <>Email address <strong>{email}</strong> has been verified.</>;
                }

                NiceModal.show(ConfirmationModal, {
                    title,
                    prompt,
                    okLabel: 'Close',
                    cancelLabel: '',
                    onOk: (confirmModal) => {
                        confirmModal?.remove();
                        updateRoute('');
                    }
                });
            } catch (e) {
                let prompt = 'There was an error verifying your email address. Please try again later.';

                if (e instanceof APIError && e.message === 'Token expired') {
                    prompt = 'The verification link has expired. Please request a new verification email.';
                }

                NiceModal.show(ConfirmationModal, {
                    title: 'Error verifying email address',
                    prompt,
                    okLabel: 'Close',
                    cancelLabel: '',
                    onOk: (confirmModal) => {
                        confirmModal?.remove();
                        updateRoute('');
                    }
                });
                handleError(e, {withToast: false});
            }
        };

        verify();
    }, [token, hasVerified, verifyEmail, handleError, updateRoute]);

    return null;
};

export default NiceModal.create(VerifiedEmailVerifyModal);
