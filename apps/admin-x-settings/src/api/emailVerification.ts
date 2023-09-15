import {Meta, createMutation} from '../utils/apiRequests';

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
        update: newData => ({
            ...newData,
            settings: newData.settings
        })
    }
});
