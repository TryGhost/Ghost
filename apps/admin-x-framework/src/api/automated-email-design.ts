import {Meta, createMutation, createQuery} from '../utils/api/hooks';

// Resolved sender payload returned by the design read/edit endpoints. Sender
// details live at the design tier and are resolved through a backend cascade
// (per-action -> design -> newsletter -> site), so these are read-only fields:
// explicit design-tier inputs, resolved placeholders, and managed-email flags.
export type AutomatedEmailDesignSender = {
    senderNameInput: string;
    senderEmailInput: string;
    replyToEmailInput: string;
    senderNamePlaceholder: string;
    senderEmailPlaceholder: string;
    replyToEmailPlaceholder: string;
    resolvedSenderName: string;
    resolvedSenderEmail: string;
    resolvedReplyToEmail: string;
    showSenderEmailInput: boolean;
    senderEmailDomain: string | null;
    hasDistinctReplyTo: boolean;
}

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
} & AutomatedEmailDesignSender;

export interface AutomatedEmailDesignResponseType {
    meta?: Meta & {sent_email_verification?: string[]};
    automated_email_design: AutomatedEmailDesign[];
}

// Writeable design fields plus the design-tier sender fields. The read-only
// resolved sender fields are excluded; sender_reply_to may trigger verification.
export type EditAutomatedEmailDesign = Omit<Partial<AutomatedEmailDesign>, 'id' | keyof AutomatedEmailDesignSender> & {
    sender_name?: string | null;
    sender_email?: string | null;
    sender_reply_to?: string | null;
};

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
