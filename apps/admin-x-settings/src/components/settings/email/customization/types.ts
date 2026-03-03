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
export type VerifiedEmailSpecialOption = {
    value: string;
    label: string;
};

export type VerifiedEmailContext = {
    type: 'newsletter' | 'setting' | 'automated_email';
    id?: string;
    property?: string;
    key?: string;
    source?: 'email_customization';
};

export type EmailCustomizationFormState = {
    id: string;
    sender_name: string;
    sender_email: string;
    sender_reply_to: string;
};

export type BaseEmailDesignFormState = {
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

export type NewsletterDesignFormState = {
    post_title_color: string | null;
    title_alignment: EmailTitleAlignment;
};

export type AutomationDesignFormState = {}; // eslint-disable-line @typescript-eslint/no-empty-object-type

export type NewsletterContentFormState = {
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

export type NewsletterCustomizationFormState = EmailCustomizationFormState & BaseEmailDesignFormState & NewsletterDesignFormState & NewsletterContentFormState & {
    name: string;
    description: string;
    subscribe_on_signup: boolean;
};

export type AutomationContentFormState = {
    show_header_title: boolean;
    footer_content: string;
};

export type AutomationCustomizationFormState = EmailCustomizationFormState & BaseEmailDesignFormState & AutomationDesignFormState & AutomationContentFormState;

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

export type TabDefinitionContext<TEntity, TFormState extends EmailCustomizationFormState> = {
    entity: TEntity;
    formState: TFormState;
    siteTitle: string;
    siteIcon: string | null;
    commentsEnabled: boolean;
    accentColor: string;
    updateFormState: (fields: Partial<TFormState>) => void;
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
        verifiedEmail?: {
            sender?: {
                context: VerifiedEmailContext;
                placeholder: string;
            };
            replyTo?: {
                context: VerifiedEmailContext;
                placeholder: string;
                specialOptions?: VerifiedEmailSpecialOption[];
            };
        };
    };
};

export type TabDefinition<TEntity, TFormState extends EmailCustomizationFormState> = {
    id: string;
    title: string;
    render: (context: TabDefinitionContext<TEntity, TFormState>) => ReactNode;
};

export type EmailTypeAdapter<TType extends EmailCustomizationType, TEntity, TFormState extends EmailCustomizationFormState> = {
    type: TType;
    title: string;
    previewRenderer: ComponentType<{model: EmailPreviewModelByType[TType]}>;
    useRead: (id: string) => {data: unknown; isLoading: boolean; error: unknown};
    getEntity: (data: unknown) => TEntity | undefined;
    useEdit: () => {mutateAsync: (payload: TEntity) => Promise<unknown>};
    useAdditionalData?: (id: string) => {data: unknown; isLoading: boolean};
    createFormState: (context: {id: string; entity?: TEntity; additionalData?: unknown}) => TFormState;
    buildPreviewModel: (formState: TFormState) => EmailPreviewModelByType[TType];
    saveFormState: (context: {id: string; formState: TFormState; entity: TEntity; editEntity: (payload: TEntity) => Promise<unknown>; additionalData?: unknown}) => Promise<void> | void;
    useTabContextData: (context: {id: string; formState: TFormState; entity?: TEntity; editEntity: (payload: TEntity) => Promise<unknown>; onAfterClose: () => void}) => Pick<TabDefinitionContext<TEntity, TFormState>, 'generalStatusAction' | 'emailInfoContext'>;
    validateFormState?: (formState: TFormState, context: {config: Config}) => ErrorMessages;
    buildTabDefinitions: (context: TabDefinitionContext<TEntity, TFormState>) => TabDefinition<TEntity, TFormState>[];
};

export type EmailEntityByType = {
    newsletter: Newsletter;
    automation: AutomatedEmail;
};

export type EmailFormStateByType = {
    newsletter: NewsletterCustomizationFormState;
    automation: AutomationCustomizationFormState;
};

export type EmailTypeAdapterMap = {
    [K in EmailCustomizationType]: EmailTypeAdapter<K, EmailEntityByType[K], EmailFormStateByType[K]>;
};

export type AnyEmailTypeAdapter = EmailTypeAdapterMap[EmailCustomizationType];
