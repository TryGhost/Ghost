import NewsletterPreview from '../previews/newsletter-preview';
import NiceModal from '@ebay/nice-modal-react';
import {ConfirmationModal, LimitModal, showToast} from '@tryghost/admin-x-design-system';
import {DEFAULT_NEWSLETTER_DESIGN_VALUES} from '../design/constants';
import {type EmailTypeAdapter, type Newsletter, type NewsletterCustomizationDraft} from '../types';
import {HostLimitError, useLimiter} from '../../../../../hooks/use-limiter';
import {type NewslettersEditResponseType, type NewslettersResponseType, useActiveNewslettersCount, useEditNewsletter, useReadNewsletter} from '@tryghost/admin-x-framework/api/newsletters';
import {buildDesignTabDefinition, buildNewsletterContentTabDefinition, buildNewsletterGeneralTabDefinition} from '../tabs/build-tab-definitions';
import {getSenderFieldContext, normalizeNewsletterSenderPayload, resolveNewsletterSenderInfo, validateNewsletterSenderFields} from '../sender/helpers';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
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
    draft,
    entity
}: {
    draft: NewsletterCustomizationDraft;
    entity: Newsletter;
}): Newsletter => ({
    ...entity,
    description: draft.description || null,
    name: draft.name,
    background_color: draft.background_color || 'light',
    header_background_color: draft.header_background_color || 'transparent',
    header_image: draft.header_image.trim() || null,
    title_font_category: draft.title_font_category,
    title_font_weight: draft.title_font_weight,
    body_font_category: draft.body_font_category,
    post_title_color: draft.post_title_color,
    title_alignment: draft.title_alignment,
    section_title_color: draft.section_title_color,
    button_color: draft.button_color,
    button_style: draft.button_style,
    button_corners: draft.button_corners,
    link_color: draft.link_color,
    link_style: draft.link_style,
    image_corners: draft.image_corners,
    divider_color: draft.divider_color,
    sender_name: draft.sender_name.trim() || null,
    ...normalizeNewsletterSenderPayload({
        sender_email: draft.sender_email,
        sender_reply_to: draft.sender_reply_to
    }),
    show_header_icon: draft.show_header_icon,
    show_header_title: draft.show_header_title,
    show_header_name: draft.show_header_name,
    show_post_title_section: draft.show_post_title_section,
    show_excerpt: draft.show_excerpt,
    show_feature_image: draft.show_feature_image,
    feedback_enabled: draft.feedback_enabled,
    show_comment_cta: draft.show_comment_cta,
    show_latest_posts: draft.show_latest_posts,
    show_subscription_details: draft.show_subscription_details,
    footer_content: draft.footer_content || null,
    show_badge: draft.show_badge,
    subscribe_on_signup: draft.subscribe_on_signup
});

export const newsletterAdapter: EmailTypeAdapter<'newsletter', Newsletter, NewsletterCustomizationDraft> = {
    type: 'newsletter',
    title: 'Customize newsletter',
    previewRenderer: NewsletterPreview,
    useRead: id => useReadNewsletter(id, {
        enabled: Boolean(id)
    }),
    getEntity: data => (data as NewslettersResponseType | undefined)?.newsletters?.[0],
    useEdit: useEditNewsletter,
    createDraft: ({id, entity}) => {
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
            title_font_weight: mapFontWeightForCategory(titleFontCategory, (entity?.title_font_weight as NewsletterCustomizationDraft['title_font_weight']) || DEFAULT_NEWSLETTER_DESIGN_VALUES.title_font_weight),
            body_font_category: entity?.body_font_category === 'serif' ? 'serif' : DEFAULT_NEWSLETTER_DESIGN_VALUES.body_font_category,
            post_title_color: entity?.post_title_color ?? DEFAULT_NEWSLETTER_DESIGN_VALUES.post_title_color,
            title_alignment: entity?.title_alignment === 'left' ? 'left' : DEFAULT_NEWSLETTER_DESIGN_VALUES.title_alignment,
            section_title_color: entity?.section_title_color ?? DEFAULT_NEWSLETTER_DESIGN_VALUES.section_title_color,
            button_color: entity?.button_color ?? DEFAULT_NEWSLETTER_DESIGN_VALUES.button_color,
            button_style: entity?.button_style === 'outline' ? 'outline' : DEFAULT_NEWSLETTER_DESIGN_VALUES.button_style,
            button_corners: (entity?.button_corners as NewsletterCustomizationDraft['button_corners']) || DEFAULT_NEWSLETTER_DESIGN_VALUES.button_corners,
            link_color: entity?.link_color ?? DEFAULT_NEWSLETTER_DESIGN_VALUES.link_color,
            link_style: (entity?.link_style as NewsletterCustomizationDraft['link_style']) || DEFAULT_NEWSLETTER_DESIGN_VALUES.link_style,
            image_corners: (entity?.image_corners as NewsletterCustomizationDraft['image_corners']) || DEFAULT_NEWSLETTER_DESIGN_VALUES.image_corners,
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
    buildPreviewModel: draft => ({
        type: 'newsletter',
        name: draft.name,
        sender_name: draft.sender_name,
        sender_email: draft.sender_email,
        sender_reply_to: draft.sender_reply_to,
        background_color: draft.background_color,
        header_background_color: draft.header_background_color,
        header_image: draft.header_image,
        title_font_category: draft.title_font_category,
        title_font_weight: draft.title_font_weight,
        body_font_category: draft.body_font_category,
        post_title_color: draft.post_title_color,
        title_alignment: draft.title_alignment,
        section_title_color: draft.section_title_color,
        button_color: draft.button_color,
        button_style: draft.button_style,
        button_corners: draft.button_corners,
        link_color: draft.link_color,
        link_style: draft.link_style,
        image_corners: draft.image_corners,
        divider_color: draft.divider_color,
        show_header_icon: draft.show_header_icon,
        show_header_title: draft.show_header_title,
        show_header_name: draft.show_header_name,
        show_post_title_section: draft.show_post_title_section,
        show_excerpt: draft.show_excerpt,
        show_feature_image: draft.show_feature_image,
        feedback_enabled: draft.feedback_enabled,
        show_comment_cta: draft.show_comment_cta,
        show_latest_posts: draft.show_latest_posts,
        show_subscription_details: draft.show_subscription_details,
        footer_content: draft.footer_content,
        show_badge: draft.show_badge
    }),
    saveDraft: async ({draft, entity, editEntity}) => {
        const result = await editEntity(buildNewsletterPayload({
            draft,
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
    useTabContextData: ({draft, entity, editEntity}) => {
        const handleError = useHandleError();
        const limiter = useLimiter();
        const {updateRoute} = useRouting();
        const {config, settings} = useGlobalData();
        const [defaultEmailAddress, supportEmailAddress] = getSettingValues<string>(settings, ['default_email_address', 'support_email_address']);
        const {data: activeNewsletterCount} = useActiveNewslettersCount();
        const {renderedReplyTo, renderedSenderEmail} = resolveNewsletterSenderInfo({
            sender: {
                sender_email: draft.sender_email,
                sender_reply_to: draft.sender_reply_to
            },
            context: {
                config,
                defaultEmailAddress,
                supportEmailAddress
            }
        });
        const emailInfoContext = getSenderFieldContext({
            config,
            defaultEmailAddress,
            renderedSenderEmail,
            renderedReplyTo
        });

        if (!entity) {
            return {emailInfoContext};
        }

        const archiveNewsletter = async () => {
            await NiceModal.show(ConfirmationModal, {
                title: 'Archive newsletter',
                prompt: `Your newsletter ${draft.name} will no longer be visible to members or available as an option when publishing new posts. Existing posts previously sent as this newsletter will remain unchanged.`,
                okLabel: 'Archive',
                okColor: 'red',
                onOk: async (modal) => {
                    try {
                        await editEntity({
                            ...buildNewsletterPayload({
                                draft,
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
                prompt: `Reactivating ${draft.name} will immediately make it visible to members and re-enable it as an option when publishing new posts.`,
                okLabel: 'Reactivate',
                onOk: async (modal) => {
                    try {
                        await editEntity({
                            ...buildNewsletterPayload({
                                draft,
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
    validateDraft: (draft, {config}) => {
        const errors: Record<string, string> = {};

        if (!draft.name.trim()) {
            errors.name = 'A name is required for your newsletter';
        }

        const {senderEmailError, senderReplyToError} = validateNewsletterSenderFields({
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
        buildNewsletterGeneralTabDefinition<Newsletter, NewsletterCustomizationDraft>(),
        buildNewsletterContentTabDefinition<Newsletter, NewsletterCustomizationDraft>(),
        buildDesignTabDefinition<Newsletter, NewsletterCustomizationDraft>()
    ]
};
