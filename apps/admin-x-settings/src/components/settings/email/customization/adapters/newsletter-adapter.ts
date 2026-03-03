import NewsletterPreview from '../previews/newsletter-preview';
import NiceModal from '@ebay/nice-modal-react';
import {ConfirmationModal, LimitModal, showToast} from '@tryghost/admin-x-design-system';
import {DEFAULT_NEWSLETTER_DESIGN_VALUES} from '../design/constants';
import {type EmailTypeAdapter, type Newsletter, type NewsletterCustomizationFormState} from '../types';
import {HostLimitError, useLimiter} from '../../../../../hooks/use-limiter';
import {type NewslettersEditResponseType, type NewslettersResponseType, useActiveNewslettersCount, useEditNewsletter, useReadNewsletter} from '@tryghost/admin-x-framework/api/newsletters';
import {buildDesignTabDefinition, buildNewsletterContentTabDefinition, buildNewsletterGeneralTabDefinition} from '../tabs/build-tab-definitions';
import {getSenderFieldContext, normalizeNewsletterSenderPayload, resolveNewsletterSenderInfo, validateNewsletterSenderFields} from '../sender/helpers';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {isManagedEmail} from '@tryghost/admin-x-framework/api/config';
import {mapFontWeightForCategory} from '../design/helpers';
import {useGlobalData} from '@src/components/providers/global-data-provider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useRouting} from '@tryghost/admin-x-framework/routing';

type NewsletterStatusAction = {
    label: string;
    color: 'red' | 'green';
    onClick: () => void | Promise<void>;
};

type GetNewsletterGeneralStatusActionArgs = {
    status: Newsletter['status'];
    activeNewsletterCount?: number;
    onArchive: () => void | Promise<void>;
    onReactivate: () => void | Promise<void>;
};

export const getNewsletterGeneralStatusAction = ({
    status,
    activeNewsletterCount,
    onArchive,
    onReactivate
}: GetNewsletterGeneralStatusActionArgs): NewsletterStatusAction | undefined => {
    if (status === 'active') {
        if (activeNewsletterCount === undefined || activeNewsletterCount <= 1) {
            return undefined;
        }

        return {
            label: 'Archive newsletter',
            color: 'red',
            onClick: onArchive
        };
    }

    return {
        label: 'Reactivate newsletter',
        color: 'green',
        onClick: onReactivate
    };
};

const buildNewsletterPayload = ({
    formState,
    entity
}: {
    formState: NewsletterCustomizationFormState;
    entity: Newsletter;
}): Newsletter => ({
    ...entity,
    description: formState.description || null,
    name: formState.name,
    background_color: formState.background_color || 'light',
    header_background_color: formState.header_background_color || 'transparent',
    header_image: formState.header_image.trim() || null,
    title_font_category: formState.title_font_category,
    title_font_weight: formState.title_font_weight,
    body_font_category: formState.body_font_category,
    post_title_color: formState.post_title_color,
    title_alignment: formState.title_alignment,
    section_title_color: formState.section_title_color,
    button_color: formState.button_color,
    button_style: formState.button_style,
    button_corners: formState.button_corners,
    link_color: formState.link_color,
    link_style: formState.link_style,
    image_corners: formState.image_corners,
    divider_color: formState.divider_color,
    sender_name: formState.sender_name.trim() || null,
    ...normalizeNewsletterSenderPayload({
        sender_email: formState.sender_email,
        sender_reply_to: formState.sender_reply_to
    }),
    show_header_icon: formState.show_header_icon,
    show_header_title: formState.show_header_title,
    show_header_name: formState.show_header_name,
    show_post_title_section: formState.show_post_title_section,
    show_excerpt: formState.show_excerpt,
    show_feature_image: formState.show_feature_image,
    feedback_enabled: formState.feedback_enabled,
    show_comment_cta: formState.show_comment_cta,
    show_latest_posts: formState.show_latest_posts,
    show_subscription_details: formState.show_subscription_details,
    footer_content: formState.footer_content || null,
    show_badge: formState.show_badge,
    subscribe_on_signup: formState.subscribe_on_signup
});

export const newsletterAdapter: EmailTypeAdapter<'newsletter', Newsletter, NewsletterCustomizationFormState> = {
    type: 'newsletter',
    title: 'Customize newsletter',
    previewRenderer: NewsletterPreview,
    useRead: id => useReadNewsletter(id, {
        enabled: Boolean(id)
    }),
    getEntity: data => (data as NewslettersResponseType | undefined)?.newsletters?.[0],
    useEdit: useEditNewsletter,
    createFormState: ({id, entity}) => {
        const titleFontCategory = entity?.title_font_category === 'serif' ? 'serif' : DEFAULT_NEWSLETTER_DESIGN_VALUES.title_font_category;

        return {
            id,
            name: entity?.name || '',
            description: entity?.description || '',
            sender_name: entity?.sender_name || '',
            sender_email: entity?.sender_email || '',
            sender_reply_to: entity?.sender_reply_to || 'newsletter',
            background_color: entity?.background_color || DEFAULT_NEWSLETTER_DESIGN_VALUES.background_color,
            header_background_color: entity?.header_background_color || DEFAULT_NEWSLETTER_DESIGN_VALUES.header_background_color,
            header_image: entity?.header_image || '',
            title_font_category: titleFontCategory,
            title_font_weight: mapFontWeightForCategory(titleFontCategory, (entity?.title_font_weight as NewsletterCustomizationFormState['title_font_weight']) || DEFAULT_NEWSLETTER_DESIGN_VALUES.title_font_weight),
            body_font_category: entity?.body_font_category === 'serif' ? 'serif' : DEFAULT_NEWSLETTER_DESIGN_VALUES.body_font_category,
            post_title_color: entity?.post_title_color ?? DEFAULT_NEWSLETTER_DESIGN_VALUES.post_title_color,
            title_alignment: entity?.title_alignment === 'left' ? 'left' : DEFAULT_NEWSLETTER_DESIGN_VALUES.title_alignment,
            section_title_color: entity?.section_title_color ?? DEFAULT_NEWSLETTER_DESIGN_VALUES.section_title_color,
            button_color: entity?.button_color ?? DEFAULT_NEWSLETTER_DESIGN_VALUES.button_color,
            button_style: entity?.button_style === 'outline' ? 'outline' : DEFAULT_NEWSLETTER_DESIGN_VALUES.button_style,
            button_corners: (entity?.button_corners as NewsletterCustomizationFormState['button_corners']) || DEFAULT_NEWSLETTER_DESIGN_VALUES.button_corners,
            link_color: entity?.link_color ?? DEFAULT_NEWSLETTER_DESIGN_VALUES.link_color,
            link_style: (entity?.link_style as NewsletterCustomizationFormState['link_style']) || DEFAULT_NEWSLETTER_DESIGN_VALUES.link_style,
            image_corners: (entity?.image_corners as NewsletterCustomizationFormState['image_corners']) || DEFAULT_NEWSLETTER_DESIGN_VALUES.image_corners,
            divider_color: entity?.divider_color ?? DEFAULT_NEWSLETTER_DESIGN_VALUES.divider_color,
            show_header_icon: entity?.show_header_icon ?? true,
            show_header_title: entity?.show_header_title ?? true,
            show_header_name: entity?.show_header_name ?? true,
            show_post_title_section: entity?.show_post_title_section ?? true,
            show_excerpt: entity?.show_excerpt ?? false,
            show_feature_image: entity?.show_feature_image ?? true,
            feedback_enabled: entity?.feedback_enabled ?? false,
            show_comment_cta: entity?.show_comment_cta ?? true,
            show_latest_posts: entity?.show_latest_posts ?? false,
            show_subscription_details: entity?.show_subscription_details ?? false,
            footer_content: entity?.footer_content || '',
            show_badge: entity?.show_badge ?? true,
            subscribe_on_signup: entity?.subscribe_on_signup ?? true
        };
    },
    buildPreviewModel: formState => ({
        type: 'newsletter',
        name: formState.name,
        sender_name: formState.sender_name,
        sender_email: formState.sender_email,
        sender_reply_to: formState.sender_reply_to,
        background_color: formState.background_color,
        header_background_color: formState.header_background_color,
        header_image: formState.header_image,
        title_font_category: formState.title_font_category,
        title_font_weight: formState.title_font_weight,
        body_font_category: formState.body_font_category,
        post_title_color: formState.post_title_color,
        title_alignment: formState.title_alignment,
        section_title_color: formState.section_title_color,
        button_color: formState.button_color,
        button_style: formState.button_style,
        button_corners: formState.button_corners,
        link_color: formState.link_color,
        link_style: formState.link_style,
        image_corners: formState.image_corners,
        divider_color: formState.divider_color,
        show_header_icon: formState.show_header_icon,
        show_header_title: formState.show_header_title,
        show_header_name: formState.show_header_name,
        show_post_title_section: formState.show_post_title_section,
        show_excerpt: formState.show_excerpt,
        show_feature_image: formState.show_feature_image,
        feedback_enabled: formState.feedback_enabled,
        show_comment_cta: formState.show_comment_cta,
        show_latest_posts: formState.show_latest_posts,
        show_subscription_details: formState.show_subscription_details,
        footer_content: formState.footer_content,
        show_badge: formState.show_badge
    }),
    saveFormState: async ({formState, entity, editEntity}) => {
        const result = await editEntity(buildNewsletterPayload({
            formState,
            entity
        })) as NewslettersEditResponseType | undefined;
        const sentVerification = result?.meta?.sent_email_verification?.[0];

        if (sentVerification === 'sender_email' || sentVerification === 'sender_reply_to') {
            showToast({
                icon: 'email',
                message: 'We\'ve sent a confirmation email to the new address.',
                type: 'info'
            });
        }
    },
    useTabContextData: ({id, formState, entity, editEntity}) => {
        const handleError = useHandleError();
        const limiter = useLimiter();
        const {updateRoute} = useRouting();
        const {config, settings} = useGlobalData();
        const useVerifiedEmailSelect = isManagedEmail(config);
        const [defaultEmailAddress, supportEmailAddress] = getSettingValues<string>(settings, ['default_email_address', 'support_email_address']);
        const {data: activeNewsletterCount} = useActiveNewslettersCount();
        const {renderedReplyTo, renderedSenderEmail} = resolveNewsletterSenderInfo({
            sender: {
                sender_email: formState.sender_email,
                sender_reply_to: formState.sender_reply_to
            },
            context: {
                config,
                defaultEmailAddress,
                supportEmailAddress
            }
        });
        const baseEmailInfoContext = getSenderFieldContext({
            config,
            defaultEmailAddress,
            renderedSenderEmail,
            renderedReplyTo
        });
        const emailInfoContext = useVerifiedEmailSelect ? {
            ...baseEmailInfoContext,
            verifiedEmail: {
                sender: {
                    context: {
                        type: 'newsletter',
                        id,
                        property: 'sender_email',
                        source: 'email_customization'
                    },
                    placeholder: baseEmailInfoContext.senderEmailPlaceholder || 'Sender email'
                },
                replyTo: {
                    context: {
                        type: 'newsletter',
                        id,
                        property: 'sender_reply_to',
                        source: 'email_customization'
                    },
                    placeholder: baseEmailInfoContext.replyToPlaceholder || 'Reply-to email',
                    specialOptions: [
                        {value: 'newsletter', label: 'Newsletter address'},
                        {value: 'support', label: 'Support address'}
                    ]
                }
            }
        } : baseEmailInfoContext;

        if (!entity) {
            return {emailInfoContext};
        }

        const archiveNewsletter = async () => {
            await NiceModal.show(ConfirmationModal, {
                title: 'Archive newsletter',
                prompt: `Your newsletter ${formState.name} will no longer be visible to members or available as an option when publishing new posts. Existing posts previously sent as this newsletter will remain unchanged.`,
                okLabel: 'Archive',
                okColor: 'red',
                onOk: async (modal) => {
                    try {
                        await editEntity({
                            ...buildNewsletterPayload({
                                formState,
                                entity
                            }),
                            status: 'archived'
                        });
                        modal?.remove();
                        showToast({
                            type: 'success',
                            message: 'Newsletter archived'
                        });
                    } catch (error) {
                        handleError(error);
                    }
                }
            });
        };

        const reactivateNewsletter = async () => {
            try {
                await limiter?.errorIfWouldGoOverLimit('newsletters');
            } catch (error) {
                if (error instanceof HostLimitError) {
                    await NiceModal.show(LimitModal, {
                        prompt: error.message || `Your current plan doesn't support more newsletters.`,
                        onOk: () => updateRoute({route: '/pro', isExternal: true})
                    });
                    return;
                }

                handleError(error);
                return;
            }

            await NiceModal.show(ConfirmationModal, {
                title: 'Reactivate newsletter',
                prompt: `Reactivating ${formState.name} will immediately make it visible to members and re-enable it as an option when publishing new posts.`,
                okLabel: 'Reactivate',
                onOk: async (modal) => {
                    try {
                        await editEntity({
                            ...buildNewsletterPayload({
                                formState,
                                entity
                            }),
                            status: 'active'
                        });
                        modal?.remove();
                        showToast({
                            type: 'success',
                            message: 'Newsletter reactivated'
                        });
                    } catch (error) {
                        handleError(error);
                    }
                }
            });
        };

        return {
            emailInfoContext,
            generalStatusAction: getNewsletterGeneralStatusAction({
                status: entity.status,
                activeNewsletterCount,
                onArchive: archiveNewsletter,
                onReactivate: reactivateNewsletter
            })
        };
    },
    validateFormState: (formState, {config}) => {
        const errors: Record<string, string> = {};

        if (!formState.name.trim()) {
            errors.name = 'A name is required for your newsletter';
        }

        const {senderEmailError, senderReplyToError} = validateNewsletterSenderFields({
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
        buildNewsletterGeneralTabDefinition<Newsletter, NewsletterCustomizationFormState>(),
        buildNewsletterContentTabDefinition<Newsletter, NewsletterCustomizationFormState>(),
        buildDesignTabDefinition<Newsletter, NewsletterCustomizationFormState>()
    ]
};
