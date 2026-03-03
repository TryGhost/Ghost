import {Meta, createMutation, createQueryWithId} from '../utils/api/hooks';
import {updateQueryCache} from '../utils/api/update-queries';

export type EmailTemplate = {
    id: string;
    slug: string;
    background_color: string;
    header_background_color: string;
    header_image: string | null;
    show_header_title: boolean;
    footer_content: string | null;
    title_font_category: 'serif' | 'sans_serif';
    title_font_weight: 'normal' | 'medium' | 'semibold' | 'bold';
    body_font_category: 'serif' | 'sans_serif';
    section_title_color: string | null;
    button_color: string | null;
    button_style: 'fill' | 'outline';
    button_corners: 'square' | 'rounded' | 'pill';
    link_color: string | null;
    link_style: 'underline' | 'regular' | 'bold';
    image_corners: 'square' | 'rounded';
    divider_color: string | null;
    created_at: string;
    updated_at: string | null;
};

export interface EmailTemplatesResponseType {
    meta?: Meta;
    email_templates: EmailTemplate[];
}

const dataType = 'EmailTemplatesResponseType';

export const useReadEmailTemplate = createQueryWithId<EmailTemplatesResponseType>({
    dataType,
    path: slug => `/email_templates/${slug}/`
});

export const useEditEmailTemplate = createMutation<EmailTemplatesResponseType, Partial<EmailTemplate> & {slug: string}>({
    method: 'PUT',
    path: emailTemplate => `/email_templates/${emailTemplate.slug}/`,
    body: emailTemplate => ({email_templates: [emailTemplate]}),
    updateQueries: {
        dataType,
        emberUpdateType: 'createOrUpdate',
        update: updateQueryCache('email_templates')
    }
});
