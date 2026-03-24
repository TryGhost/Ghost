import {Meta, createMutation, createQuery} from '../utils/api/hooks';
import {updateQueryCache} from '../utils/api/update-queries';

export type EmailTemplate = {
    id: string;
    name: string;
    slug: string;
    header_image: string | null;
    show_publication_title: boolean;
    show_badge: boolean;
    footer_content: string | null;
    background_color: string;
    title_font_category: string;
    title_font_weight: string;
    body_font_category: string;
    header_background_color: string;
    title_alignment: string;
    post_title_color: string | null;
    section_title_color: string | null;
    button_color: string | null;
    button_style: string;
    button_corners: string;
    link_color: string | null;
    link_style: string;
    image_corners: string;
    divider_color: string | null;
    created_at: string;
    updated_at: string | null;
}

export interface EmailTemplatesResponseType {
    meta?: Meta;
    email_templates: EmailTemplate[];
}

const dataType = 'EmailTemplatesResponseType';

export const useBrowseEmailTemplates = createQuery<EmailTemplatesResponseType>({
    dataType,
    path: '/email_templates/'
});

export const useEditEmailTemplate = createMutation<EmailTemplatesResponseType, EmailTemplate>({
    method: 'PUT',
    path: emailTemplate => `/email_templates/${emailTemplate.id}/`,
    body: emailTemplate => ({email_templates: [emailTemplate]}),
    updateQueries: {
        dataType,
        emberUpdateType: 'createOrUpdate',
        update: updateQueryCache('email_templates')
    }
});
