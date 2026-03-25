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
    // Design settings
    background_color: string;
    header_background_color: string;
    title_font_category: string;
    title_font_weight: string;
    body_font_category: string;
    title_alignment: string;
    section_title_color: string | null;
    button_color: string | null;
    button_style: string;
    button_corners: string;
    link_color: string | null;
    link_style: string;
    image_corners: string;
    divider_color: string | null;
    // General settings
    header_image: string | null;
    show_header_title: boolean;
    show_badge: boolean;
    footer_content: string | null;
    // Timestamps
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

export const useBulkEditAutomatedEmails = createMutation<AutomatedEmailsResponseType, Partial<AutomatedEmail>[]>({
    method: 'PUT',
    path: () => '/automated_emails/',
    body: automatedEmails => ({automated_emails: automatedEmails}),
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
