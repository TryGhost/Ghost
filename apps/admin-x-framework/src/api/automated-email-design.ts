import {Meta, createMutation, createQuery} from '../utils/api/hooks';

export type AutomatedEmailDesign = {
    id: string;
    slug: string;
    background_color: string;
    header_background_color: string;
    header_image: string | null;
    show_header_icon: boolean;
    show_header_title: boolean;
    footer_content: string | null;
    button_color: string | null;
    button_corners: string;
    button_style: string;
    link_color: string | null;
    link_style: string;
    body_font_category: string;
    title_font_category: string;
    title_font_weight: string;
    image_corners: string;
    divider_color: string | null;
    section_title_color: string | null;
    show_badge: boolean;
    created_at: string;
    updated_at: string | null;
}

export interface AutomatedEmailDesignResponseType {
    meta?: Meta;
    automated_email_design: AutomatedEmailDesign[];
}

export type EditAutomatedEmailDesign = Omit<Partial<AutomatedEmailDesign>, 'id'>;

const dataType = 'AutomatedEmailDesignResponseType';

export const useReadAutomatedEmailDesign = createQuery<AutomatedEmailDesignResponseType>({
    dataType,
    path: '/automated_emails/design/'
});

export const useEditAutomatedEmailDesign = createMutation<AutomatedEmailDesignResponseType, EditAutomatedEmailDesign>({
    method: 'PUT',
    path: () => '/automated_emails/design/',
    body: design => ({automated_email_design: [design]}),
    updateQueries: {
        emberUpdateType: 'skip',
        dataType,
        update: newData => newData
    }
});
