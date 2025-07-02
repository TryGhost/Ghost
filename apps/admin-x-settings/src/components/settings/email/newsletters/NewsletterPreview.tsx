import NewsletterPreviewContent from './NewsletterPreviewContent';
import React from 'react';
import {Newsletter} from '@tryghost/admin-x-framework/api/newsletters';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {renderReplyToEmail, renderSenderEmail} from '../../../../utils/newsletterEmails';
import {textColorForBackgroundColor} from '@tryghost/color-utils';
import {useGlobalData} from '../../../providers/GlobalDataProvider';

const NewsletterPreview: React.FC<{newsletter: Newsletter}> = ({newsletter}) => {
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

        return '#ffffff';
    };

    const headerBackgroundColor = () => {
        const value = newsletter.header_background_color;

        if (!value || value === 'transparent') {
            return 'transparent';
        }

        const validHex = /#([0-9a-f]{3}){1,2}$/i;

        if (validHex.test(value)) {
            return value;
        }

        return 'transparent';
    };

    const buttonColor = () => {
        const value = newsletter.button_color;

        const validHex = /#([0-9a-f]{3}){1,2}$/i;

        if (validHex.test(value || '')) {
            return value;
        }

        if (value === null) {
            const bg = backgroundColor();
            return textColorForBackgroundColor(bg).hex();
        }

        return siteData.accent_color;
    };

    const buttonTextColor = () => {
        const buttonStyle = newsletter.button_style;
        const calcButtonColor = buttonColor();

        if (calcButtonColor && buttonStyle === 'fill') {
            return textColorForBackgroundColor(calcButtonColor).hex();
        }

        return undefined;
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

    const postTitleColor = () => {
        const value = newsletter.post_title_color;

        const validHex = /#([0-9a-f]{3}){1,2}$/i;

        if (validHex.test(value || '')) {
            return value;
        }

        if (value === 'accent') {
            return siteData.accent_color;
        }

        const headerBgColor = headerBackgroundColor();
        const bgColor = headerBgColor === 'transparent' ? backgroundColor() : headerBgColor;

        return textColorForBackgroundColor(bgColor).hex();
    };

    const sectionTitleColor = () => {
        const value = newsletter.section_title_color;

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

    const headerTextColor = headerBackgroundColor() === 'transparent' ? textColor : textColorForBackgroundColor(headerBackgroundColor()).hex();
    const secondaryHeaderTextColor = headerBackgroundColor() === 'transparent' ? secondaryTextColor : textColorForBackgroundColor(headerBackgroundColor()).alpha(0.5).toString();

    type Colors = {
        backgroundColor?: string;
        headerBackgroundColor?: string;
        postTitleColor?: string;
        sectionTitleColor?: string;
        buttonColor?: string;
        buttonTextColor?: string;
        linkColor?: string;
        dividerColor?: string;
        textColor?: string;
        secondaryTextColor?: string;
        headerTextColor?: string;
        secondaryHeaderTextColor?: string;
    }

    const colors: Colors = {
        backgroundColor: backgroundColor(),
        headerBackgroundColor: headerBackgroundColor(),
        postTitleColor: postTitleColor() || undefined,
        sectionTitleColor: sectionTitleColor() || undefined,
        buttonColor: buttonColor() || undefined,
        buttonTextColor: buttonTextColor() || undefined,
        linkColor: linkColor() || undefined,
        dividerColor: dividerColor() || undefined,
        textColor,
        secondaryTextColor,
        headerTextColor,
        secondaryHeaderTextColor
    };

    return <NewsletterPreviewContent
        accentColor={siteData.accent_color}
        authorPlaceholder={currentUser.name || currentUser.email}
        backgroundColor={colors.backgroundColor || '#ffffff'}
        bodyFontCategory={newsletter.body_font_category}
        buttonCorners={newsletter.button_corners || 'rounded'}
        buttonStyle={newsletter.button_style || 'fill'}
        dividerStyle={newsletter.divider_style || 'solid'}
        footerContent={newsletter.footer_content}
        headerBackgroundColor={colors.headerBackgroundColor || 'transparent'}
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
        titleFontWeight={newsletter.title_font_weight || 'bold'}
        {...colors}
    />;
};

export default NewsletterPreview;
