/**
 * @deprecated This hook handles legacy MagicLink-based verification tokens via PUT /settings/verifications.
 * New verification tokens are handled by the centralized EmailVerificationService
 * via PUT /verified-emails/. See api/verified-emails.ts for the new hook.
 * This file can be removed once all legacy tokens have expired (24 hours after deploy).
 */
import {Meta, createMutation} from '../utils/api/hooks';

export type emailVerification = {
    token: string;
};

export interface EmailVerificationResponseType {
    meta?: Meta,
    settings: [];
}
const dataType = 'SettingsResponseType';

export const verifyEmailToken = createMutation<EmailVerificationResponseType, emailVerification>({
    path: () => '/settings/verifications',
    method: 'PUT',
    body: ({token}) => ({token}),
    updateQueries: {
        dataType,
        emberUpdateType: 'createOrUpdate',
        update: newData => ({
            ...newData,
            settings: newData.settings
        })
    }
});
