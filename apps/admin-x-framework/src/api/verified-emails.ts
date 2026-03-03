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

export interface VerifiedEmailsVerifyResponseType {
    email: string;
    context?: {
        type: string;
        id?: string;
        property?: string;
        key?: string;
    };
}

export interface VerifiedEmailsAddResponseType {
    verified: boolean;
    pending: boolean;
    email: string;
}

const dataType = 'VerifiedEmailsResponseType';

export const useBrowseVerifiedEmails = createQuery<VerifiedEmailsResponseType>({
    dataType,
    path: '/verified-emails/'
});

export const useAddVerifiedEmail = createMutation<VerifiedEmailsAddResponseType, {email: string; context?: {type: string; id?: string; property?: string; key?: string}}>({
    method: 'POST',
    path: () => '/verified-emails/',
    body: ({email, context}) => ({email, context}),
    updateQueries: {
        dataType,
        emberUpdateType: 'createOrUpdate',
        update: newData => newData
    }
});

export const useVerifyVerifiedEmail = createMutation<VerifiedEmailsVerifyResponseType, {token: string}>({
    method: 'PUT',
    path: () => '/verified-emails/verify/',
    body: ({token}) => ({token}),
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
