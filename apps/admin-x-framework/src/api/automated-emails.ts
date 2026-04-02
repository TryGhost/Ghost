import {Meta, createMutation, createQuery} from '../utils/api/hooks';
import {insertToQueryCache, updateQueryCache} from '../utils/api/update-queries';

export type AutomatedEmail = {
    id: string;
    status: 'active' | 'inactive';
    name: string;
    slug: string;
    subject: string;
    lexical: string | null;
    sender_name: string | null;
    sender_email: string | null;
    sender_reply_to: string | null;
    created_at: string;
    updated_at: string | null;
}

export interface AutomatedEmailsResponseType {
    meta?: Meta;
    automated_emails: AutomatedEmail[];
}

export interface AutomatedEmailsEditSendersResponseType extends AutomatedEmailsResponseType {
    meta?: Meta & {sent_email_verification: string[]};
}

export interface AutomatedEmailsVerifyResponseType extends AutomatedEmailsResponseType {
    meta?: Meta & {email_verified: string};
}

const dataType = 'AutomatedEmailsResponseType';

export const useBrowseAutomatedEmails = createQuery<AutomatedEmailsResponseType>({
    dataType,
    path: '/automated_emails/'
});

export const useAddAutomatedEmail = createMutation<AutomatedEmailsResponseType, Partial<AutomatedEmail>>({
    method: 'POST',
    path: () => '/automated_emails/',
    body: automatedEmail => ({automated_emails: [automatedEmail]}),
    updateQueries: {
        dataType,
        emberUpdateType: 'createOrUpdate',
        update: insertToQueryCache('automated_emails')
    }
});

export const useEditAutomatedEmail = createMutation<AutomatedEmailsResponseType, AutomatedEmail>({
    method: 'PUT',
    path: automatedEmail => `/automated_emails/${automatedEmail.id}/`,
    body: automatedEmail => ({automated_emails: [automatedEmail]}),
    updateQueries: {
        dataType,
        emberUpdateType: 'createOrUpdate',
        update: updateQueryCache('automated_emails')
    }
});

type EditAutomatedEmailSendersPayload = {
    sender_name?: string | null;
    sender_email?: string | null;
    sender_reply_to?: string | null;
};

export const useEditAutomatedEmailSenders = createMutation<AutomatedEmailsEditSendersResponseType, EditAutomatedEmailSendersPayload>({
    method: 'PUT',
    path: () => '/automated_emails/senders/',
    body: payload => payload,
    updateQueries: {
        dataType,
        emberUpdateType: 'createOrUpdate',
        update: updateQueryCache('automated_emails')
    }
});

export const useVerifyAutomatedEmailSender = createMutation<AutomatedEmailsVerifyResponseType, {token: string}>({
    method: 'PUT',
    path: () => '/automated_emails/verifications/',
    body: ({token}) => ({token}),
    updateQueries: {
        dataType,
        emberUpdateType: 'createOrUpdate',
        update: updateQueryCache('automated_emails')
    }
});

export const useSendTestWelcomeEmail = createMutation<unknown, {id: string; email: string; subject: string; lexical: string}>({
    method: 'POST',
    path: ({id}) => `/automated_emails/${id}/test/`,
    body: ({email, subject, lexical}) => ({email, subject, lexical})
});
