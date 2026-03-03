import {createMutation, createQuery} from '../utils/api/hooks';

export type VerifiedEmail = {
    id: string;
    email: string;
    status: 'pending' | 'verified';
    created_at: string;
    updated_at: string | null;
};

export interface VerifiedEmailsResponseType {
    verified_emails: VerifiedEmail[];
}

export interface VerifyVerifiedEmailResponseType extends VerifiedEmailsResponseType {
    meta?: {
        context: {
            type: string;
            id?: string;
            property?: string;
            key?: string;
        } | null;
    };
}

const dataType = 'VerifiedEmailsResponseType';

export const useBrowseVerifiedEmails = createQuery<VerifiedEmailsResponseType>({
    dataType,
    path: '/verified-emails/'
});

export const useAddVerifiedEmail = createMutation<VerifiedEmailsResponseType, {email: string; context?: {type: string; id?: string; property?: string; key?: string}}>({
    method: 'POST',
    path: () => '/verified-emails/',
    body: ({email, context}) => ({verified_emails: [{email, context}]}),
    updateQueries: {
        dataType,
        emberUpdateType: 'createOrUpdate',
        update: newData => newData
    }
});

export const useVerifyVerifiedEmail = createMutation<VerifyVerifiedEmailResponseType, {token: string}>({
    method: 'PUT',
    path: () => '/verified-emails/verify/',
    body: ({token}) => ({verified_emails: [{token}]}),
    updateQueries: {
        dataType,
        emberUpdateType: 'createOrUpdate',
        update: newData => newData
    }
});

export const useDeleteVerifiedEmail = createMutation<unknown, string>({
    method: 'DELETE',
    path: id => `/verified-emails/${id}/`,
    updateQueries: {
        dataType,
        emberUpdateType: 'delete',
        update: newData => newData
    }
});
