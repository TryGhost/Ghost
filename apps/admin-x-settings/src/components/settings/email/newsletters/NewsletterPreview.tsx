import NewsletterPreviewContent from './NewsletterPreviewContent';
import React from 'react';
import useFeatureFlag from '../../../../hooks/useFeatureFlag';
import {Newsletter} from '@tryghost/admin-x-framework/api/newsletters';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {renderReplyToEmail, renderSenderEmail} from '../../../../utils/newsletterEmails';
import {textColorForBackgroundColor} from '@tryghost/color-utils';
import {useGlobalData} from '../../../providers/GlobalDataProvider';

const NewsletterPreview: React.FC<{newsletter: Newsletter}> = ({newsletter}) => {
    const hasEmailCustomization = useFeatureFlag('emailCustomization');
    const {currentUser, settings, siteData, config} = useGlobalData();
    const [title, icon, commentsEnabled, supportEmailAddress, defaultEmailAddress] = getSettingValues<string>(settings, ['title', 'icon', 'comments_enabled', 'support_email_address', 'default_email_address']);

    let headerTitle: string | null = null;
    if (newsletter.show_header_title) {
        headerTitle = title || null;
    } else if (newsletter.show_header_name) {
        headerTitle = newsletter.name;
    }

    const headerSubtitle = (newsletter.show_header_title && newsletter.show_header_name) ? newsletter.name : undefined;

    const showCommentCta = newsletter.show_comment_cta && commentsEnabled !== 'off';
    const showFeedback = newsletter.feedback_enabled && config.labs.audienceFeedback;

    const backgroundColor = () => {
        const value = newsletter.background_color;

        const validHex = /#([0-9a-f]{3}){1,2}$/i;

        if (validHex.test(value)) {
            return value;
        }

        if (value === 'dark') {
            return '#15212a';
        }

        return '#ffffff';
    };

    const headerColor = () => {
        const value = newsletter.header_color;

        if (!value || value === 'transparent') {
            return 'transparent';
        }

        const validHex = /#([0-9a-f]{3}){1,2}$/i;

        if (validHex.test(value)) {
            return value;
        }

        return 'transparent';
    };

    const borderColor = () => {
        const value = newsletter.border_color;

        const validHex = /#([0-9a-f]{3}){1,2}$/i;

        if (validHex.test(value || '')) {
            return value;
        }

        if (value === 'auto') {
            return textColorForBackgroundColor(backgroundColor()).hex();
        }

        if (value === 'accent') {
            return siteData.accent_color;
        }

        return null;
    };

    const buttonColor = () => {
        const value = newsletter.button_color;

        const validHex = /#([0-9a-f]{3}){1,2}$/i;

        if (validHex.test(value || '')) {
            return value;
        }

        if (value === 'accent') {
            return siteData.accent_color;
        }

        if (value === null) {
            const bg = backgroundColor();
            return textColorForBackgroundColor(bg).hex();
        }

        return null;
    };

    const linkColor = () => {
        const value = newsletter.link_color === undefined ? 'accent' : newsletter.link_color;

        const validHex = /#([0-9a-f]{3}){1,2}$/i;

        if (value === 'accent') {
            return siteData.accent_color;
        }

        if (validHex.test(value || '')) {
            return value;
        }

        return textColorForBackgroundColor(backgroundColor()).hex();
    };

    const secondaryBorderColor = textColorForBackgroundColor(backgroundColor()).alpha(0.12).toString();

    const titleColor = () => {
        const value = newsletter.title_color;

        const validHex = /#([0-9a-f]{3}){1,2}$/i;

        if (validHex.test(value || '')) {
            return value;
        }

        if (value === 'accent') {
            return siteData.accent_color;
        }

        return textColorForBackgroundColor(backgroundColor()).hex();
    };

    const dividerColor = () => {
        const value = newsletter.divider_color;

        const validHex = /#([0-9a-f]{3}){1,2}$/i;

        if (validHex.test(value || '')) {
            return value;
        }

        if (value === 'accent') {
            return siteData.accent_color;
        }

        return '#e0e7eb';
    };

    const textColor = textColorForBackgroundColor(backgroundColor()).hex();
    const secondaryTextColor = textColorForBackgroundColor(backgroundColor()).alpha(0.5).toString();

    const headerTextColor = headerColor() === 'transparent' ? textColor : textColorForBackgroundColor(headerColor()).hex();
    const secondaryHeaderTextColor = headerColor() === 'transparent' ? secondaryTextColor : textColorForBackgroundColor(headerColor()).alpha(0.5).toString();

    const colors = hasEmailCustomization ? {
        backgroundColor: backgroundColor(),
        headerColor: headerColor(),
        borderColor: borderColor() || undefined,
        secondaryBorderColor,
        titleColor: titleColor() || undefined,
        buttonColor: buttonColor() || undefined,
        linkColor: linkColor() || undefined,
        dividerColor: dividerColor() || undefined,
        textColor,
        secondaryTextColor,
        headerTextColor,
        secondaryHeaderTextColor
    } : {};

    return <NewsletterPreviewContent
        accentColor={siteData.accent_color}
        authorPlaceholder={currentUser.name || currentUser.email}
        backgroundColor={colors.backgroundColor || '#ffffff'}
        bodyFontCategory={newsletter.body_font_category}
        buttonCorners={newsletter.button_corners || 'squircle'}
        buttonStyle={newsletter.button_style || 'fill'}
        dividerStyle={newsletter.divider_style || 'solid'}
        footerContent={newsletter.footer_content}
        headerColor={colors.headerColor || headerColor()}
        headerIcon={newsletter.show_header_icon ? icon : undefined}
        headerImage={newsletter.header_image}
        headerSubtitle={headerSubtitle}
        headerTitle={headerTitle}
        imageCorners={newsletter.image_corners || 'square'}
        linkStyle={newsletter.link_style || 'underline'}
        senderEmail={renderSenderEmail(newsletter, config, defaultEmailAddress)}
        senderName={newsletter.sender_name || title}
        senderReplyTo={renderReplyToEmail(newsletter, config, supportEmailAddress, defaultEmailAddress)}
        showBadge={newsletter.show_badge}
        showCommentCta={showCommentCta}
        showExcerpt={newsletter.show_excerpt}
        showFeatureImage={newsletter.show_feature_image}
        showFeedback={showFeedback}
        showLatestPosts={newsletter.show_latest_posts}
        showPostTitleSection={newsletter.show_post_title_section}
        showSubscriptionDetails={newsletter.show_subscription_details}
        siteTitle={title}
        titleAlignment={newsletter.title_alignment}
        titleFontCategory={newsletter.title_font_category}
        titleFontWeight={newsletter.title_font_weight}
        {...colors}
    />;
};

export default NewsletterPreview;
