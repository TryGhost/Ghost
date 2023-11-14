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
