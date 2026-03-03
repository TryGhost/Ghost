import NewsletterPreviewContent from '../../newsletters/newsletter-preview-content';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {resolveNewsletterPreviewColors} from '../design/helpers';
import {resolveNewsletterSenderInfo} from '../sender/helpers';
import {textColorForBackgroundColor} from '@tryghost/color-utils';
import {useGlobalData} from '@src/components/providers/global-data-provider';
import type {NewsletterEmailPreviewModel} from '../types';

type NewsletterPreviewProps = {
    model: NewsletterEmailPreviewModel;
};

const NewsletterPreview: React.FC<NewsletterPreviewProps> = ({model}) => {
    const {config, currentUser, settings, siteData} = useGlobalData();
    const [title, icon, commentsEnabledSetting, supportEmailAddress, defaultEmailAddress] = getSettingValues<string>(settings, ['title', 'icon', 'comments_enabled', 'support_email_address', 'default_email_address']);
    const accentColor = siteData.accent_color;
    const commentsEnabled = commentsEnabledSetting !== 'off';

    let headerTitle: string | null = null;
    if (model.show_header_title) {
        headerTitle = title || null;
    } else if (model.show_header_name) {
        headerTitle = model.name;
    }

    const headerSubtitle = (model.show_header_title && model.show_header_name) ? model.name : undefined;
    const showCommentCta = model.show_comment_cta && commentsEnabled;
    const colors = resolveNewsletterPreviewColors({
        accentColor,
        backgroundColorValue: model.background_color,
        headerBackgroundColorValue: model.header_background_color,
        postTitleColorValue: model.post_title_color,
        sectionTitleColorValue: model.section_title_color,
        buttonColorValue: model.button_color,
        linkColorValue: model.link_color,
        dividerColorValue: model.divider_color
    });
    const buttonTextColor = model.button_style === 'fill' ? textColorForBackgroundColor(colors.buttonColor).hex() : undefined;
    const {renderedReplyTo, renderedSenderEmail} = resolveNewsletterSenderInfo({
        sender: {
            sender_email: model.sender_email,
            sender_reply_to: model.sender_reply_to
        },
        context: {
            config,
            defaultEmailAddress,
            supportEmailAddress
        }
    });

    return (
        <NewsletterPreviewContent
            accentColor={accentColor}
            authorPlaceholder={currentUser.name || currentUser.email}
            backgroundColor={colors.backgroundColor}
            bodyFontCategory={model.body_font_category}
            buttonColor={colors.buttonColor}
            buttonCorners={model.button_corners}
            buttonStyle={model.button_style}
            buttonTextColor={buttonTextColor}
            dividerColor={colors.dividerColor}
            dividerStyle='solid'
            footerContent={model.footer_content || null}
            headerBackgroundColor={colors.headerBackgroundColor}
            headerIcon={model.show_header_icon ? (icon || undefined) : undefined}
            headerImage={model.header_image || null}
            headerSubtitle={headerSubtitle}
            headerTextColor={colors.headerTextColor}
            headerTitle={headerTitle}
            imageCorners={model.image_corners}
            linkColor={colors.linkColor}
            linkStyle={model.link_style}
            postTitleColor={colors.postTitleColor}
            secondaryHeaderTextColor={colors.secondaryHeaderTextColor}
            secondaryTextColor={colors.secondaryTextColor}
            sectionTitleColor={colors.sectionTitleColor}
            senderEmail={renderedSenderEmail}
            senderName={model.sender_name || title}
            senderReplyTo={renderedReplyTo}
            showBadge={model.show_badge}
            showCommentCta={showCommentCta}
            showExcerpt={model.show_excerpt}
            showFeatureImage={model.show_feature_image}
            showFeedback={model.feedback_enabled}
            showLatestPosts={model.show_latest_posts}
            showPostTitleSection={model.show_post_title_section}
            showSubscriptionDetails={model.show_subscription_details}
            siteTitle={title}
            textColor={colors.textColor}
            titleAlignment={model.title_alignment}
            titleFontCategory={model.title_font_category}
            titleFontWeight={model.title_font_weight}
        />
    );
};

export default NewsletterPreview;
