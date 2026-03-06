import AutomationPreview from '../previews/automation-preview';
import {type AutomatedEmail, type AutomationCustomizationDraft, type EmailTypeAdapter} from '../types';
import {type AutomatedEmailsResponseType, useEditAutomatedEmail, useReadAutomatedEmail} from '@tryghost/admin-x-framework/api/automated-emails';
import {DEFAULT_AUTOMATION_DESIGN_VALUES} from '../design/constants';
import {buildAutomationDesignTabDefinition, buildGeneralTabDefinition} from '../tabs/build-tab-definitions';
import {getSenderFieldContext, normalizeAutomationSenderPayload, resolveAutomationSenderInfo, validateAutomationSenderFields} from '../sender/helpers';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {mapFontWeightForCategory} from '../design/helpers';
import {readAutomationDesignState, writeAutomationDesignState} from '../stores/automation-design-state';
import {useActiveNewsletterSenderDefaults} from '@tryghost/admin-x-framework/api/newsletters';
import {useGlobalData} from '@src/components/providers/global-data-provider';

export const automatedEmailAdapter: EmailTypeAdapter<'automation', AutomatedEmail, AutomationCustomizationDraft> = {
    type: 'automation',
    title: 'Customize automation',
    previewRenderer: AutomationPreview,
    useRead: id => useReadAutomatedEmail(id, {
        enabled: Boolean(id)
    }),
    getEntity: data => (data as AutomatedEmailsResponseType | undefined)?.automated_emails?.[0],
    useEdit: useEditAutomatedEmail,
    createDraft: ({id, entity}) => {
        const designState = readAutomationDesignState();

        return {
            id,
            sender_name: entity?.sender_name || '',
            sender_email: entity?.sender_email || '',
            sender_reply_to: entity?.sender_reply_to || '',
            background_color: designState.background_color || DEFAULT_AUTOMATION_DESIGN_VALUES.background_color,
            header_background_color: designState.header_background_color || DEFAULT_AUTOMATION_DESIGN_VALUES.header_background_color,
            header_image: designState.header_image || DEFAULT_AUTOMATION_DESIGN_VALUES.header_image,
            show_header_title: designState.show_header_title ?? false,
            footer_content: designState.footer_content || '',
            title_font_category: designState.title_font_category || DEFAULT_AUTOMATION_DESIGN_VALUES.title_font_category,
            title_font_weight: mapFontWeightForCategory(designState.title_font_category || DEFAULT_AUTOMATION_DESIGN_VALUES.title_font_category, designState.title_font_weight || DEFAULT_AUTOMATION_DESIGN_VALUES.title_font_weight),
            body_font_category: designState.body_font_category || DEFAULT_AUTOMATION_DESIGN_VALUES.body_font_category,
            section_title_color: designState.section_title_color ?? DEFAULT_AUTOMATION_DESIGN_VALUES.section_title_color,
            button_color: designState.button_color === undefined ? DEFAULT_AUTOMATION_DESIGN_VALUES.button_color : designState.button_color,
            button_style: designState.button_style || DEFAULT_AUTOMATION_DESIGN_VALUES.button_style,
            button_corners: designState.button_corners || DEFAULT_AUTOMATION_DESIGN_VALUES.button_corners,
            link_color: designState.link_color === undefined ? DEFAULT_AUTOMATION_DESIGN_VALUES.link_color : designState.link_color,
            link_style: designState.link_style || DEFAULT_AUTOMATION_DESIGN_VALUES.link_style,
            image_corners: designState.image_corners || DEFAULT_AUTOMATION_DESIGN_VALUES.image_corners,
            divider_color: designState.divider_color ?? DEFAULT_AUTOMATION_DESIGN_VALUES.divider_color
        };
    },
    buildPreviewModel: draft => ({
        type: 'automation',
        sender_name: draft.sender_name,
        sender_email: draft.sender_email,
        sender_reply_to: draft.sender_reply_to,
        background_color: draft.background_color,
        header_background_color: draft.header_background_color,
        header_image: draft.header_image,
        show_header_title: draft.show_header_title,
        footer_content: draft.footer_content,
        title_font_category: draft.title_font_category,
        title_font_weight: draft.title_font_weight,
        body_font_category: draft.body_font_category,
        section_title_color: draft.section_title_color,
        button_color: draft.button_color,
        button_style: draft.button_style,
        button_corners: draft.button_corners,
        link_color: draft.link_color,
        link_style: draft.link_style,
        image_corners: draft.image_corners,
        divider_color: draft.divider_color
    }),
    saveDraft: async ({draft, entity, editEntity}) => {
        const payload: AutomatedEmail = {
            ...entity,
            sender_name: draft.sender_name.trim() || null,
            ...normalizeAutomationSenderPayload({
                sender_email: draft.sender_email,
                sender_reply_to: draft.sender_reply_to
            })
        };

        await editEntity(payload);
        writeAutomationDesignState({
            background_color: draft.background_color,
            header_background_color: draft.header_background_color,
            header_image: draft.header_image,
            show_header_title: draft.show_header_title,
            footer_content: draft.footer_content,
            title_font_category: draft.title_font_category,
            title_font_weight: draft.title_font_weight,
            body_font_category: draft.body_font_category,
            section_title_color: draft.section_title_color,
            button_color: draft.button_color,
            button_style: draft.button_style,
            button_corners: draft.button_corners,
            link_color: draft.link_color,
            link_style: draft.link_style,
            image_corners: draft.image_corners,
            divider_color: draft.divider_color
        });
    },
    useTabContextData: ({draft}) => {
        const {config, settings} = useGlobalData();
        const [defaultEmailAddress, supportEmailAddress] = getSettingValues<string>(settings, ['default_email_address', 'support_email_address']);
        const {data: fallbackNewsletter} = useActiveNewsletterSenderDefaults();
        const {renderedReplyTo, renderedSenderEmail} = resolveAutomationSenderInfo({
            sender: {
                sender_email: draft.sender_email,
                sender_reply_to: draft.sender_reply_to
            },
            fallbackNewsletter,
            context: {
                config,
                defaultEmailAddress,
                supportEmailAddress
            }
        });

        return {
            emailInfoContext: getSenderFieldContext({
                config,
                defaultEmailAddress,
                renderedReplyTo,
                renderedSenderEmail
            })
        };
    },
    validateDraft: (draft, {config}) => {
        const errors: Record<string, string> = {};
        const {senderEmailError, senderReplyToError} = validateAutomationSenderFields({
            senderEmail: draft.sender_email,
            senderReplyTo: draft.sender_reply_to,
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
        buildGeneralTabDefinition<AutomatedEmail, AutomationCustomizationDraft>(),
        buildAutomationDesignTabDefinition<AutomatedEmail, AutomationCustomizationDraft>()
    ]
};
