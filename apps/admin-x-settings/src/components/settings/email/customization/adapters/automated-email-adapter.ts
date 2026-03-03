import AutomationPreview from '../previews/automation-preview';
import {type AutomatedEmail, type AutomationCustomizationFormState, type EmailTypeAdapter} from '../types';
import {type AutomatedEmailsResponseType, useEditAutomatedEmail, useReadAutomatedEmail} from '@tryghost/admin-x-framework/api/automated-emails';
import {DEFAULT_AUTOMATION_DESIGN_VALUES} from '../design/constants';
import {type EmailTemplate, type EmailTemplatesResponseType, useEditEmailTemplate, useReadEmailTemplate} from '@tryghost/admin-x-framework/api/email-templates';
import {buildAutomationDesignTabDefinition, buildGeneralTabDefinition} from '../tabs/build-tab-definitions';
import {getSenderFieldContext, normalizeAutomationSenderPayload, resolveAutomationSenderInfo, validateAutomationSenderFields} from '../sender/helpers';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {isManagedEmail} from '@tryghost/admin-x-framework/api/config';
import {mapFontWeightForCategory} from '../design/helpers';
import {useActiveNewsletterSenderDefaults} from '@tryghost/admin-x-framework/api/newsletters';
import {useGlobalData} from '@src/components/providers/global-data-provider';
import {useMemo} from 'react';

const AUTOMATED_EMAIL_TEMPLATE_SLUG = 'automated-email';

type AdditionalData = {
    template?: EmailTemplate;
    editTemplate: (payload: Partial<EmailTemplate> & {slug: string}) => Promise<unknown>;
};

const getAdditionalData = (additionalData: unknown): AdditionalData => {
    return (additionalData as AdditionalData) || {editTemplate: async () => {}};
};

export const automatedEmailAdapter: EmailTypeAdapter<'automation', AutomatedEmail, AutomationCustomizationFormState> = {
    type: 'automation',
    title: 'Customize automation',
    previewRenderer: AutomationPreview,
    useRead: id => useReadAutomatedEmail(id, {
        enabled: Boolean(id)
    }),
    getEntity: data => (data as AutomatedEmailsResponseType | undefined)?.automated_emails?.[0],
    useEdit: useEditAutomatedEmail,
    useAdditionalData: () => {
        const {data: templateData, isLoading} = useReadEmailTemplate(AUTOMATED_EMAIL_TEMPLATE_SLUG);
        const {mutateAsync: editTemplate} = useEditEmailTemplate();
        const template = (templateData as EmailTemplatesResponseType | undefined)?.email_templates?.[0];
        const data = useMemo(() => ({template, editTemplate}) as AdditionalData, [template, editTemplate]);
        return {
            data,
            isLoading
        };
    },
    createFormState: ({id, entity, additionalData}) => {
        const {template} = getAdditionalData(additionalData);
        const titleFontCategory = template?.title_font_category || DEFAULT_AUTOMATION_DESIGN_VALUES.title_font_category;

        return {
            id,
            sender_name: entity?.sender_name || '',
            sender_email: entity?.sender_email || '',
            sender_reply_to: entity?.sender_reply_to || '',
            background_color: template?.background_color || DEFAULT_AUTOMATION_DESIGN_VALUES.background_color,
            header_background_color: template?.header_background_color || DEFAULT_AUTOMATION_DESIGN_VALUES.header_background_color,
            header_image: template?.header_image || DEFAULT_AUTOMATION_DESIGN_VALUES.header_image,
            show_header_title: template?.show_header_title ?? false,
            footer_content: template?.footer_content || '',
            title_font_category: titleFontCategory,
            title_font_weight: mapFontWeightForCategory(titleFontCategory, template?.title_font_weight || DEFAULT_AUTOMATION_DESIGN_VALUES.title_font_weight),
            body_font_category: template?.body_font_category || DEFAULT_AUTOMATION_DESIGN_VALUES.body_font_category,
            section_title_color: template?.section_title_color ?? DEFAULT_AUTOMATION_DESIGN_VALUES.section_title_color,
            button_color: template?.button_color === undefined ? DEFAULT_AUTOMATION_DESIGN_VALUES.button_color : template?.button_color,
            button_style: template?.button_style || DEFAULT_AUTOMATION_DESIGN_VALUES.button_style,
            button_corners: template?.button_corners || DEFAULT_AUTOMATION_DESIGN_VALUES.button_corners,
            link_color: template?.link_color === undefined ? DEFAULT_AUTOMATION_DESIGN_VALUES.link_color : template?.link_color,
            link_style: template?.link_style || DEFAULT_AUTOMATION_DESIGN_VALUES.link_style,
            image_corners: template?.image_corners || DEFAULT_AUTOMATION_DESIGN_VALUES.image_corners,
            divider_color: template?.divider_color ?? DEFAULT_AUTOMATION_DESIGN_VALUES.divider_color
        };
    },
    buildPreviewModel: formState => ({
        type: 'automation',
        sender_name: formState.sender_name,
        sender_email: formState.sender_email,
        sender_reply_to: formState.sender_reply_to,
        background_color: formState.background_color,
        header_background_color: formState.header_background_color,
        header_image: formState.header_image,
        show_header_title: formState.show_header_title,
        footer_content: formState.footer_content,
        title_font_category: formState.title_font_category,
        title_font_weight: formState.title_font_weight,
        body_font_category: formState.body_font_category,
        section_title_color: formState.section_title_color,
        button_color: formState.button_color,
        button_style: formState.button_style,
        button_corners: formState.button_corners,
        link_color: formState.link_color,
        link_style: formState.link_style,
        image_corners: formState.image_corners,
        divider_color: formState.divider_color
    }),
    saveFormState: async ({formState, entity, editEntity, additionalData}) => {
        const payload: AutomatedEmail = {
            ...entity,
            sender_name: formState.sender_name.trim() || null,
            ...normalizeAutomationSenderPayload({
                sender_email: formState.sender_email,
                sender_reply_to: formState.sender_reply_to
            })
        };

        await editEntity(payload);

        const {template, editTemplate} = getAdditionalData(additionalData);

        await editTemplate({
            slug: AUTOMATED_EMAIL_TEMPLATE_SLUG,
            ...(template?.id ? {id: template.id} : {}),
            background_color: formState.background_color,
            header_background_color: formState.header_background_color,
            header_image: formState.header_image || null,
            show_header_title: formState.show_header_title,
            footer_content: formState.footer_content || null,
            title_font_category: formState.title_font_category,
            title_font_weight: formState.title_font_weight,
            body_font_category: formState.body_font_category,
            section_title_color: formState.section_title_color,
            button_color: formState.button_color,
            button_style: formState.button_style,
            button_corners: formState.button_corners,
            link_color: formState.link_color,
            link_style: formState.link_style,
            image_corners: formState.image_corners,
            divider_color: formState.divider_color
        });
    },
    useTabContextData: ({id, formState}) => {
        const {config, settings} = useGlobalData();
        const useVerifiedEmailSelect = isManagedEmail(config);
        const [defaultEmailAddress, supportEmailAddress] = getSettingValues<string>(settings, ['default_email_address', 'support_email_address']);
        const {data: fallbackNewsletter} = useActiveNewsletterSenderDefaults();
        const {renderedReplyTo, renderedSenderEmail} = resolveAutomationSenderInfo({
            sender: {
                sender_email: formState.sender_email,
                sender_reply_to: formState.sender_reply_to
            },
            fallbackNewsletter,
            context: {
                config,
                defaultEmailAddress,
                supportEmailAddress
            }
        });
        const baseEmailInfoContext = getSenderFieldContext({
            config,
            defaultEmailAddress,
            renderedReplyTo,
            renderedSenderEmail
        });

        return {
            emailInfoContext: useVerifiedEmailSelect ? {
                ...baseEmailInfoContext,
                verifiedEmail: {
                    sender: {
                        context: {
                            type: 'automated_email',
                            id,
                            property: 'sender_email',
                            source: 'email_customization'
                        },
                        placeholder: baseEmailInfoContext.senderEmailPlaceholder || 'Sender email'
                    },
                    replyTo: {
                        context: {
                            type: 'automated_email',
                            id,
                            property: 'sender_reply_to',
                            source: 'email_customization'
                        },
                        placeholder: baseEmailInfoContext.replyToPlaceholder || 'Reply-to email'
                    }
                }
            } : baseEmailInfoContext
        };
    },
    validateFormState: (formState, {config}) => {
        const errors: Record<string, string> = {};
        const {senderEmailError, senderReplyToError} = validateAutomationSenderFields({
            senderEmail: formState.sender_email,
            senderReplyTo: formState.sender_reply_to,
            config
        });

        if (senderEmailError) {
            errors.sender_email = senderEmailError;
        }

        if (senderReplyToError) {
            errors.sender_reply_to = senderReplyToError;
        }

        return errors;
    },
    buildTabDefinitions: () => [
        buildGeneralTabDefinition<AutomatedEmail, AutomationCustomizationFormState>(),
        buildAutomationDesignTabDefinition<AutomatedEmail, AutomationCustomizationFormState>()
    ]
};
