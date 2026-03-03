import NiceModal from '@ebay/nice-modal-react';
import React, {useEffect, useState} from 'react';
import {APIError} from '@tryghost/admin-x-framework/errors';
import {ConfirmationModal} from '@tryghost/admin-x-design-system';
import {showToast} from '@tryghost/admin-x-design-system';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useQueryClient} from '@tryghost/admin-x-framework';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import {useVerifyVerifiedEmail} from '@tryghost/admin-x-framework/api/verified-emails';
import type {RoutingModalProps} from '@tryghost/admin-x-framework/routing';

/**
 * Get the route to navigate to after verification based on context
 */
function getRouteForContext(context?: {type: string; id?: string} | null): string {
    if (context?.type === 'newsletter' && context.id) {
        return `newsletters/${context.id}`;
    }
    return '';
}

const VerifiedEmailVerifyModal: React.FC<RoutingModalProps> = ({searchParams}) => {
    const token = searchParams?.get('verifyEmail');
    const {mutateAsync: verifyEmail} = useVerifyVerifiedEmail();
    const handleError = useHandleError();
    const {updateRoute} = useRouting();
    const queryClient = useQueryClient();
    const [hasVerified, setHasVerified] = useState(false);

    useEffect(() => {
        if (!token || hasVerified) {
            return;
        }

        setHasVerified(true);

        const verify = async () => {
            try {
                const result = await verifyEmail({token});
                const verifiedEmail = result?.verified_emails?.[0];
                const email = verifiedEmail?.email || '';
                const context = result?.meta?.context;

                // The backend applies the verified email to the target (newsletter/setting/automated_email)
                // via context stored in the token. Invalidate these caches so the UI picks up the changes.
                queryClient.invalidateQueries(['NewslettersResponseType']);
                queryClient.invalidateQueries(['SettingsResponseType']);
                queryClient.invalidateQueries(['AutomatedEmailsResponseType']);

                const route = getRouteForContext(context);

                if (route) {
                    // Navigate to the target modal (e.g. newsletter) so the user
                    // can see the verified email has been applied
                    showToast({
                        type: 'success',
                        message: `${email} has been verified`
                    });
                    updateRoute(route);
                } else {
                    NiceModal.show(ConfirmationModal, {
                        title: 'Email address verified',
                        prompt: <>Email address <strong>{email}</strong> has been verified and is now available for use.</>,
                        okLabel: 'Close',
                        cancelLabel: '',
                        onOk: (confirmModal) => {
                            confirmModal?.remove();
                            updateRoute('');
                        }
                    });
                }
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
    }, [token, hasVerified, verifyEmail, handleError, updateRoute, queryClient]);

    return null;
};

export default NiceModal.create(VerifiedEmailVerifyModal);
