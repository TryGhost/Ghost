import {Meta, createMutation, createQuery} from '../utils/api/hooks';
import {deleteFromQueryCache, insertToQueryCache, updateQueryCache} from '../utils/api/update-queries';

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
    campaign_type: string | null;
    delay_days: number | null;
    sort_order: number;
    version: number;
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

export const useDeleteAutomatedEmail = createMutation<unknown, string>({
    method: 'DELETE',
    path: id => `/automated_emails/${id}/`,
    updateQueries: {
        dataType,
        emberUpdateType: 'delete',
        update: deleteFromQueryCache('automated_emails')
    }
});

export type CampaignActivityEntry = {
    id: string;
    member_email: string;
    member_name: string | null;
    step_order: number | null;
    sent_at: string;
    step_name: string;
    subject: string;
    campaign_type: string;
    enrollment_status: string | null;
}

export interface CampaignActivityResponseType {
    meta?: Meta;
    activity: CampaignActivityEntry[];
}

export const useBrowseCampaignActivity = createQuery<CampaignActivityResponseType>({
    dataType: 'CampaignActivityResponseType',
    path: '/automated_emails/activity/'
});

export const useSendTestWelcomeEmail = createMutation<unknown, {id: string; email: string; subject: string; lexical: string}>({
    method: 'POST',
    path: ({id}) => `/automated_emails/${id}/test/`,
    body: ({email, subject, lexical}) => ({email, subject, lexical})
});
