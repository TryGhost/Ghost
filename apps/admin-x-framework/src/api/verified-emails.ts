import {createMutation, createQuery} from '../utils/api/hooks';

export type VerifiedEmail = {
    id: string;
    email: string;
    status: 'pending' | 'verified';
    created_at: string;
    updated_at: string | null;
};

export type InboxLinks = {
    android: string;
    desktop: string;
    provider: string;
};

export type VerifiedEmailContext = {
    type: 'newsletter' | 'setting' | 'automated_email';
    id?: string;
    property?: string;
    key?: string;
    source?: 'email_customization';
};

export interface VerifiedEmailsResponseType {
    verified_emails: VerifiedEmail[];
}

export interface AddVerifiedEmailResponseType extends VerifiedEmailsResponseType {
    meta?: {
        inbox_links: InboxLinks | null;
    };
}

export interface VerifyVerifiedEmailResponseType extends VerifiedEmailsResponseType {
    meta?: {
        context: VerifiedEmailContext | null;
    };
}

const dataType = 'VerifiedEmailsResponseType';

export const useBrowseVerifiedEmails = createQuery<VerifiedEmailsResponseType>({
    dataType,
    path: '/verified-emails/'
});

export const useAddVerifiedEmail = createMutation<AddVerifiedEmailResponseType, {email: string; context?: VerifiedEmailContext}>({
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
