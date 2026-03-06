import type {AutomatedEmail} from '@tryghost/admin-x-framework/api/automated-emails';
import type {ComponentType, ReactNode} from 'react';
import type {Config} from '@tryghost/admin-x-framework/api/config';
import type {ErrorMessages} from '@tryghost/admin-x-framework/hooks';
import type {Newsletter} from '@tryghost/admin-x-framework/api/newsletters';

export type {AutomatedEmail, Newsletter};

export type EmailCustomizationType = 'newsletter' | 'automation';

export type SupportedEmailEntity = Newsletter | AutomatedEmail;

export type EmailFontCategory = 'serif' | 'sans_serif';
export type EmailTitleFontWeight = 'normal' | 'medium' | 'semibold' | 'bold';
export type EmailTitleAlignment = 'left' | 'center';
export type EmailButtonStyle = 'fill' | 'outline';
export type EmailButtonCorners = 'square' | 'rounded' | 'pill';
export type EmailLinkStyle = 'underline' | 'regular' | 'bold';
export type EmailImageCorners = 'square' | 'rounded';

export type EmailCustomizationDraft = {
    id: string;
    sender_name: string;
    sender_email: string;
    sender_reply_to: string;
};

export type BaseEmailDesignDraft = {
    background_color: string;
    header_background_color: string;
    header_image: string;
    title_font_category: EmailFontCategory;
    title_font_weight: EmailTitleFontWeight;
    body_font_category: EmailFontCategory;
    section_title_color: string | null;
    button_color: string | null;
    button_style: EmailButtonStyle;
    button_corners: EmailButtonCorners;
    link_color: string | null;
    link_style: EmailLinkStyle;
    image_corners: EmailImageCorners;
    divider_color: string | null;
};

export type NewsletterDesignDraft = {
    post_title_color: string | null;
    title_alignment: EmailTitleAlignment;
};

export type AutomationDesignDraft = Record<string, never>;

export type NewsletterContentDraft = {
    show_header_icon: boolean;
    show_header_title: boolean;
    show_header_name: boolean;
    show_post_title_section: boolean;
    show_excerpt: boolean;
    show_feature_image: boolean;
    feedback_enabled: boolean;
    show_comment_cta: boolean;
    show_latest_posts: boolean;
    show_subscription_details: boolean;
    footer_content: string;
    show_badge: boolean;
};

export type NewsletterCustomizationDraft = EmailCustomizationDraft & BaseEmailDesignDraft & NewsletterDesignDraft & NewsletterContentDraft & {
    name: string;
    description: string;
    subscribe_on_signup: boolean;
};

export type AutomationContentDraft = {
    show_header_title: boolean;
    footer_content: string;
};

export type AutomationCustomizationDraft = EmailCustomizationDraft & BaseEmailDesignDraft & AutomationDesignDraft & AutomationContentDraft;

type BaseEmailPreviewModel = {
    sender_name: string;
    sender_email: string;
    sender_reply_to: string;
    background_color: string;
    header_background_color: string;
    header_image: string;
    title_font_category: EmailFontCategory;
    title_font_weight: EmailTitleFontWeight;
    body_font_category: EmailFontCategory;
    section_title_color: string | null;
    button_color: string | null;
    button_style: EmailButtonStyle;
    button_corners: EmailButtonCorners;
    link_color: string | null;
    link_style: EmailLinkStyle;
    image_corners: EmailImageCorners;
    divider_color: string | null;
};

export type NewsletterEmailPreviewModel = BaseEmailPreviewModel & {
    type: 'newsletter';
    name: string;
    post_title_color: string | null;
    title_alignment: EmailTitleAlignment;
    show_header_icon: boolean;
    show_header_title: boolean;
    show_header_name: boolean;
    show_post_title_section: boolean;
    show_excerpt: boolean;
    show_feature_image: boolean;
    feedback_enabled: boolean;
    show_comment_cta: boolean;
    show_latest_posts: boolean;
    show_subscription_details: boolean;
    footer_content: string;
    show_badge: boolean;
};

export type AutomationEmailPreviewModel = BaseEmailPreviewModel & {
    type: 'automation';
    show_header_title: boolean;
    footer_content: string;
};

export type EmailPreviewModel = NewsletterEmailPreviewModel | AutomationEmailPreviewModel;

export type EmailPreviewModelByType = {
    newsletter: NewsletterEmailPreviewModel;
    automation: AutomationEmailPreviewModel;
};

export type TabDefinitionContext<TEntity, TDraft extends EmailCustomizationDraft> = {
    entity: TEntity;
    draft: TDraft;
    siteTitle: string;
    siteIcon: string | null;
    commentsEnabled: boolean;
    accentColor: string;
    updateDraft: (fields: Partial<TDraft>) => void;
    errors: ErrorMessages;
    clearError: (field: string) => void;
    generalStatusAction?: {
        label: string;
        color: 'red' | 'green';
        onClick: () => void | Promise<void>;
    };
    emailInfoContext?: {
        showSenderEmailField: boolean;
        senderEmailPlaceholder: string;
        replyToPlaceholder: string;
        renderedReplyToValue: string;
    };
};

export type TabDefinition<TEntity, TDraft extends EmailCustomizationDraft> = {
    id: string;
    title: string;
    render: (context: TabDefinitionContext<TEntity, TDraft>) => ReactNode;
};

export type EmailTypeAdapter<TType extends EmailCustomizationType, TEntity, TDraft extends EmailCustomizationDraft> = {
    type: TType;
    title: string;
    previewRenderer: ComponentType<{model: EmailPreviewModelByType[TType]}>;
    useRead: (id: string) => {data: unknown; isLoading: boolean; error: unknown};
    getEntity: (data: unknown) => TEntity | undefined;
    useEdit: () => {mutateAsync: (payload: TEntity) => Promise<unknown>};
    createDraft: (context: {id: string; entity?: TEntity}) => TDraft;
    buildPreviewModel: (draft: TDraft) => EmailPreviewModelByType[TType];
    saveDraft: (context: {id: string; draft: TDraft; entity: TEntity; editEntity: (payload: TEntity) => Promise<unknown>}) => Promise<void> | void;
    useTabContextData: (context: {id: string; draft: TDraft; entity?: TEntity; editEntity: (payload: TEntity) => Promise<unknown>; onAfterClose: () => void}) => Pick<TabDefinitionContext<TEntity, TDraft>, 'generalStatusAction' | 'emailInfoContext'>;
    validateDraft?: (draft: TDraft, context: {config: Config}) => ErrorMessages;
    buildTabDefinitions: (context: TabDefinitionContext<TEntity, TDraft>) => TabDefinition<TEntity, TDraft>[];
};

export type EmailEntityByType = {
    newsletter: Newsletter;
    automation: AutomatedEmail;
};

export type EmailDraftByType = {
    newsletter: NewsletterCustomizationDraft;
    automation: AutomationCustomizationDraft;
};

export type EmailTypeAdapterMap = {
    [K in EmailCustomizationType]: EmailTypeAdapter<K, EmailEntityByType[K], EmailDraftByType[K]>;
};

export type AnyEmailTypeAdapter = EmailTypeAdapterMap[EmailCustomizationType];
