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
